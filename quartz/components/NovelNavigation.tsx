import { QuartzComponent, QuartzComponentProps } from "./types"
import { QuartzPluginData } from "../plugins/vfile"
import { FullSlug, resolveRelative } from "../util/path"

// Read chapter numbers, not the alphabetical order of Chinese titles.
export function chineseNumber(value: string): number {
  if (/^\d+$/.test(value)) return Number(value)
  const digits: Record<string, number> = {
    零: 0,
    〇: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }
  const units: Record<string, number> = { 十: 10, 百: 100, 千: 1000 }
  let total = 0
  let digit = 0
  for (const character of value) {
    if (character in units) {
      total += (digit || 1) * units[character]
      digit = 0
    } else {
      digit = digits[character] ?? 0
    }
  }
  return total + digit
}

export function readingOrder(file: QuartzPluginData): number {
  const explicit = file.frontmatter?.chapter ?? file.frontmatter?.order
  if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit
  const title = String(file.frontmatter?.title ?? file.slug ?? "")
  if (/序章|楔子/.test(title)) return 0
  const number = title.match(/第([零〇一二两三四五六七八九十百千\d]+)[章卷]/)
  return number ? chineseNumber(number[1]) : Number.MAX_SAFE_INTEGER
}

export function sortForReading(files: QuartzPluginData[]): QuartzPluginData[] {
  return [...files].sort(
    (a, b) =>
      readingOrder(a) - readingOrder(b) ||
      String(a.frontmatter?.title ?? a.slug).localeCompare(
        String(b.frontmatter?.title ?? b.slug),
        "zh-CN",
        { numeric: true },
      ),
  )
}

function chaptersIn(allFiles: QuartzPluginData[], folder: string) {
  return sortForReading(
    allFiles.filter((file) => {
      const slug = String(file.slug)
      return (
        slug.startsWith(`${folder}/`) &&
        slug !== `${folder}/index` &&
        !slug.slice(folder.length + 1).includes("/")
      )
    }),
  )
}

function NoteLink({
  file,
  current,
  children,
}: {
  file: QuartzPluginData
  current: FullSlug
  children?: string
}) {
  return (
    <a
      class="internal novel-link"
      href={resolveRelative(current, file.slug!)}
      aria-current={current === file.slug ? "page" : undefined}
    >
      {children ?? String(file.frontmatter?.title ?? file.slug)}
    </a>
  )
}

export const NovelNavigation: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  // Generated tag/404 pages are not part of the book.
  allFiles = allFiles.filter((file) => file.filePath)
  const current = fileData.slug!
  const home = allFiles.find((file) => file.slug === "index")
  const volumes = sortForReading(
    allFiles.filter(
      (file) => String(file.slug).endsWith("/index") && String(file.slug).split("/").length === 2,
    ),
  )
  const pages = sortForReading(
    allFiles.filter((file) => file.slug !== "index" && !String(file.slug).includes("/")),
  )
  return (
    <nav class="novel-navigation" aria-label="小说阅读导航">
      <details class="novel-menu" open>
        <summary>
          阅读目录<span aria-hidden="true">⌄</span>
        </summary>
        <div class="novel-menu-content">
          {home && (
            <NoteLink file={home} current={current}>
              首页
            </NoteLink>
          )}
          {volumes.map((volume) => {
            const folder = String(volume.slug).replace(/\/index$/, "")
            return (
              <div class="novel-volume" key={volume.slug}>
                <NoteLink file={volume} current={current} />
                <ol>
                  {chaptersIn(allFiles, folder).map((chapter) => (
                    <li key={chapter.slug}>
                      <NoteLink file={chapter} current={current} />
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}
          <div class="novel-extras">
            {pages.map((page) => (
              <NoteLink file={page} current={current} key={page.slug} />
            ))}
          </div>
        </div>
      </details>
    </nav>
  )
}

export const ChapterNavigation: QuartzComponent = ({
  fileData,
  allFiles,
}: QuartzComponentProps) => {
  allFiles = allFiles.filter((file) => file.filePath)
  if (fileData.slug === "index" || String(fileData.slug).endsWith("/index")) return null
  const folder = String(fileData.slug).split("/").slice(0, -1).join("/")
  if (!folder) return null
  const chapters = chaptersIn(allFiles, folder)
  const index = chapters.findIndex((file) => file.slug === fileData.slug)
  if (index < 0) return null
  const previous = chapters[index - 1]
  const next = chapters[index + 1]
  const volume = allFiles.find((file) => file.slug === `${folder}/index`)
  return (
    <nav class="chapter-navigation" aria-label="章节翻页">
      <div>
        {previous && (
          <>
            <span>上一章</span>
            <NoteLink file={previous} current={fileData.slug!} />
          </>
        )}
      </div>
      <div class="chapter-directory">
        {volume && (
          <NoteLink file={volume} current={fileData.slug!}>
            返回目录
          </NoteLink>
        )}
      </div>
      <div>
        {next && (
          <>
            <span>下一章</span>
            <NoteLink file={next} current={fileData.slug!} />
          </>
        )}
      </div>
    </nav>
  )
}
