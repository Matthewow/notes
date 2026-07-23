import { randomUUID } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

export interface FileChange {
  path: string
  contents: string
}

interface StagedFile extends FileChange {
  temporaryPath: string
  original?: string
}

async function readIfPresent(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined
    }
    throw error
  }
}

async function removeIfPresent(file: string): Promise<void> {
  try {
    await fs.unlink(file)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }
  }
}

export async function writeFilesWithRollback(changes: FileChange[]): Promise<void> {
  const staged: StagedFile[] = []
  for (const change of changes) {
    await fs.mkdir(path.dirname(change.path), { recursive: true })
    const temporaryPath = path.join(
      path.dirname(change.path),
      `.${path.basename(change.path)}.${process.pid}.${randomUUID()}.tmp`,
    )
    await fs.writeFile(temporaryPath, change.contents, { encoding: "utf8", flag: "wx" })
    staged.push({
      ...change,
      temporaryPath,
      original: await readIfPresent(change.path),
    })
  }

  const replaced: StagedFile[] = []
  try {
    for (const file of staged) {
      await fs.rename(file.temporaryPath, file.path)
      replaced.push(file)
    }
  } catch (error) {
    for (const file of replaced.toReversed()) {
      if (file.original === undefined) {
        await removeIfPresent(file.path)
      } else {
        await fs.writeFile(file.path, file.original, "utf8")
      }
    }
    throw error
  } finally {
    await Promise.all(staged.map((file) => removeIfPresent(file.temporaryPath)))
  }
}
