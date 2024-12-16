import { promises as fs } from 'fs'
import path from 'path'
import type { z } from 'zod'

import { localTypeToShadcn, type registryItemFileSchema } from '@/registry/schema'

import { registry } from '../registry'

const REGISTRY_BASE_PATH = process.cwd()
const PUBLIC_FOLDER_BASE_PATH = 'public/r'

// const REGISTRY_TYPE_FOLDERS: Record<string, string> = {
//     "registry:component": "components",
//     "registry:hook": "hooks",
//     "registry:lib": "lib",
//     "registry:block": "blocks",
// };

/**
 * bun run ./scripts/build-registry.ts
 *
 */
type File = z.infer<typeof registryItemFileSchema>

async function writeFileRecursive(filePath: string, data: string) {
  const dir = path.dirname(filePath)

  try {
    await fs.mkdir(dir, { recursive: true })

    await fs.writeFile(filePath, data, 'utf-8')
    console.log(`File written to ${filePath}`)
  } catch (error) {
    console.error(`Error writing file ${filePath}`)
    console.error(error)
  }
}

const getComponentFiles = async (files: File[], registryType: string, componentName: string) => {
  const filesArrayPromises = (files ?? []).map(async (file) => {
    if (typeof file === 'string') {
      const normalizedPath = file.startsWith('/') ? file : `/${file}`
      const filePath = path.join(REGISTRY_BASE_PATH, normalizedPath)
      const fileContent = await fs.readFile(filePath, 'utf-8')

      const fileName = normalizedPath.split('/').pop() || ''

      return {
        type: registryType,
        content: fileContent,
        path: normalizedPath,
        target: `/components/kokonutui/${fileName}`,
      }
    }
    const normalizedPath = file.path.startsWith('/')
      ? file.path
      : `/${file.path}`
    const filePath = path.join(REGISTRY_BASE_PATH, normalizedPath)
    const fileContent = await fs.readFile(filePath, 'utf-8')

    const fileName = normalizedPath.split('/').pop() || ''

    const getTargetPath = (type: string) => {
      switch (type) {
        case 'registry:context':
          return `/components/editor/context/${fileName}`
        case 'registry:hook':
          return `/components/editor/hooks/${fileName}`
        case 'registry:node':
          return `/components/editor/nodes/${fileName}`
        case 'registry:plugin':
          return `/components/editor/plugins/${fileName}`
        case 'registry:shared':
          return `/components/editor/shared/${fileName}`
        case 'registry:theme':
          return `/components/editor/themes/${fileName}`
        case 'registry:transformer':
          return `/components/editor/transformers/${fileName}`
        case 'registry:util':
          return `/components/editor/utils/${fileName}`
        case 'registry:ui':
          return `/components/editor/ui/${fileName}`
        case 'registry:block':
          return `/components/blocks/${componentName}/${fileName}`
        default:
          return `/components/${fileName}`
      }
    }

    const fileType =
      typeof file === 'string' ? registryType : file.type || registryType

    return {
      type: localTypeToShadcn[fileType as keyof typeof localTypeToShadcn],
      content: fileContent,
      path: normalizedPath,
      target:
        typeof file === 'string'
          ? getTargetPath(registryType)
          : file.target || getTargetPath(fileType),
    }
  })

  const filesArray = await Promise.all(filesArrayPromises)
  return filesArray
}

const main = async () => {
  for (let i = 0; i < registry.length; i++) {
    const component = registry[i]
    const files = component.files
    if (!files) throw new Error('No files found for component')

    const filesArray = await getComponentFiles(files, component.type, component.name)

    const json = JSON.stringify(
      {
        ...component,
        files: filesArray,
      },
      null,
      2
    )
    const jsonPath = `${PUBLIC_FOLDER_BASE_PATH}/${component.name}.json`
    await writeFileRecursive(jsonPath, json)
    console.log(json)
  }
}

main()
  .then(() => {
    console.log('done')
  })
  .catch((err) => {
    console.error(err)
  })
