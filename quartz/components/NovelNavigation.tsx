import { QuartzComponent, QuartzComponentProps } from "./types"
import { QuartzPluginData } from "../plugins/vfile"
import { FullSlug, resolveRelative } from "../util/path"
import sidebarScript from "./scripts/novel-sidebar"

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

function volumesIn(allFiles: QuartzPluginData[]) {
  return sortForReading(
    allFiles.filter(
      (file) => String(file.slug).endsWith("/index") && String(file.slug).split("/").length === 2,
    ),
  )
}

export function readingSequence(allFiles: QuartzPluginData[]): QuartzPluginData[] {
  const files = allFiles.filter((file) => file.filePath)
  const home = files.find((file) => file.slug === "index")
  const introduction = files.find((file) => file.slug === "声明与人物介绍")
  return [
    ...(home ? [home] : []),
    ...(introduction ? [introduction] : []),
    ...volumesIn(files).flatMap((volume) => [
      volume,
      ...chaptersIn(files, String(volume.slug).replace(/\/index$/, "")),
    ]),
  ]
}

export const SidebarToggle: QuartzComponent = () => (
  <button
    type="button"
    class="novel-sidebar-toggle"
    aria-controls="novel-sidebar"
    aria-expanded="true"
    aria-label="隐藏导航"
    title="隐藏导航"
  >
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M5.5 9h1M5.5 12h1M5.5 15h1" />
    </svg>
    <span>隐藏导航</span>
  </button>
)

SidebarToggle.beforeDOMLoaded = `(() => {
  try {
    if (localStorage.getItem("novel-sidebar-hidden") === "true") {
      document.documentElement.dataset.novelNav = "hidden"
    }
  } catch {}
})()`
SidebarToggle.afterDOMLoaded = sidebarScript

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
  const introduction = allFiles.find((file) => file.slug === "声明与人物介绍")
  const volumes = volumesIn(allFiles)
  const pages = sortForReading(
    allFiles.filter(
      (file) => file.slug !== "index" && file !== introduction && !String(file.slug).includes("/"),
    ),
  )
  return (
    <nav id="novel-sidebar" class="novel-navigation" aria-label="小说阅读导航">
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
          {introduction && <NoteLink file={introduction} current={current} />}
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
  const sequence = readingSequence(allFiles)
  const index = sequence.findIndex((file) => file.slug === fileData.slug)
  if (index < 0) return null
  const previous = sequence[index - 1]
  const next = sequence[index + 1]
  if (fileData.slug === "index") {
    return next ? (
      <a
        class="internal home-entry"
        href={resolveRelative(fileData.slug!, next.slug!)}
        aria-label="向下继续：声明与人物介绍"
      >
        <span>声明 · 人物介绍</span>
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
          aria-hidden="true"
        >
          <path d="m6 8 6 6 6-6M6 14l6 6 6-6" />
        </svg>
      </a>
    ) : null
  }
  const folder = String(fileData.slug).split("/").slice(0, -1).join("/")
  const volume = allFiles.find((file) => file.slug === `${folder}/index`)
  const isChapter = Boolean(folder) && !String(fileData.slug).endsWith("/index")
  return (
    <nav class="chapter-navigation" aria-label="章节翻页">
      <div>
        {previous && (
          <>
            <span>{isChapter && previous?.slug !== volume?.slug ? "上一章" : "上一页"}</span>
            <NoteLink file={previous} current={fileData.slug!} />
          </>
        )}
      </div>
      <div class="chapter-directory">
        {volume && isChapter && (
          <NoteLink file={volume} current={fileData.slug!}>
            返回目录
          </NoteLink>
        )}
      </div>
      <div>
        {next && (
          <>
            <span>{isChapter && !String(next?.slug).endsWith("/index") ? "下一章" : "下一页"}</span>
            <NoteLink file={next} current={fileData.slug!} />
          </>
        )}
      </div>
    </nav>
  )
}
