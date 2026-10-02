import test from "node:test"
import assert from "node:assert/strict"
import {
  chineseNumber,
  readingOrder,
  sortForReading,
  NovelNavigation,
  ChapterNavigation,
  readingSequence,
} from "./NovelNavigation"
import { render } from "preact-render-to-string"
import { QuartzComponentProps } from "./types"
import { FullSlug, FilePath } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"

function chapter(title: string, chapterNumber?: number): QuartzPluginData {
  return { frontmatter: { title, tags: [], chapter: chapterNumber } } as QuartzPluginData
}

test("Chinese and Arabic chapter numbers", () => {
  for (const [input, expected] of [
    ["一", 1],
    ["十", 10],
    ["十一", 11],
    ["二十", 20],
    ["二十五", 25],
    ["一百零二", 102],
    ["001", 1],
  ] as const) {
    assert.equal(chineseNumber(input), expected)
  }
})

test("prologue comes first, followed by chapters in reading order", () => {
  const files = [
    chapter("第十章"),
    chapter("第一章 开门"),
    chapter("序章：意义"),
    chapter("第二章"),
  ]
  assert.deepEqual(
    sortForReading(files).map((file) => file.frontmatter?.title),
    ["序章：意义", "第一章 开门", "第二章", "第十章"],
  )
  assert.equal(files[0].frontmatter?.title, "第十章", "sorting does not mutate its input")
})

test("explicit chapter order has priority over the title", () => {
  assert.equal(readingOrder(chapter("序章：意义", 4)), 4)
  assert.equal(readingOrder(chapter("无编号章节")), Number.MAX_SAFE_INTEGER)
})

test("navigation excludes virtual pages and connects the two chapters", () => {
  const note = (slug: string, title: string, real = true) =>
    ({
      slug: slug as FullSlug,
      frontmatter: { title, tags: [] },
      ...(real ? { filePath: `content/${slug}.md` as FilePath } : {}),
    }) as QuartzPluginData
  const allFiles = [
    note("index", "书名"),
    note("第一卷/index", "第一卷"),
    note("第一卷/第一章-开门", "第一章 开门"),
    note("第一卷/序章", "序章：意义"),
    note("声明与人物介绍", "声明与人物介绍"),
    note("tags/index", "标签索引", false),
    note("404", "无法找到", false),
  ]
  const props = { allFiles, fileData: allFiles[3] } as QuartzComponentProps
  const html = render(NovelNavigation(props))
  assert.ok(html.indexOf("序章：意义") < html.indexOf("第一章 开门"))
  assert.ok(html.includes('aria-current="page"'))
  assert.ok(!html.includes("标签索引") && !html.includes("无法找到"))
  const pagination = render(ChapterNavigation(props))
  assert.ok(pagination.includes("下一章") && pagination.includes("第一章 开门"))
  assert.ok(pagination.includes("上一页") && !pagination.includes("上一章"))
  assert.ok(pagination.includes("返回目录"))
  assert.deepEqual(
    readingSequence(allFiles).map((file) => file.slug),
    ["index", "声明与人物介绍", "第一卷/index", "第一卷/序章", "第一卷/第一章-开门"],
  )
  const cover = render(ChapterNavigation({ ...props, fileData: allFiles[0] }))
  assert.ok(cover.includes("home-entry") && cover.includes("声明与人物介绍"))
  const intro = render(ChapterNavigation({ ...props, fileData: allFiles[4] }))
  assert.ok(intro.includes("下一页") && intro.includes("第一卷"))
  const directory = render(ChapterNavigation({ ...props, fileData: allFiles[1] }))
  assert.ok(directory.includes("声明与人物介绍") && directory.includes("序章：意义"))
})
