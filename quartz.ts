import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import {
  NovelNavigation,
  ChapterNavigation,
  SidebarToggle,
} from "./quartz/components/NovelNavigation"
import { PageTypeDispatcher } from "./quartz/plugins/pageTypes"

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()

// Keep Quartz's search and theme controls; replace the alphabetic file explorer
// with a book navigation shared by every reading page.
layout.defaults.left = [...(layout.defaults.left ?? []), NovelNavigation]
layout.defaults.afterBody = [...(layout.defaults.afterBody ?? []), ChapterNavigation]
layout.defaults.beforeBody = [SidebarToggle, ...(layout.defaults.beforeBody ?? [])]
for (const [pageType, pageLayout] of Object.entries(layout.byPageType)) {
  if (pageType === "404") continue
  pageLayout.left = [...(pageLayout.left ?? []), NovelNavigation]
  pageLayout.afterBody = [...(pageLayout.afterBody ?? []), ChapterNavigation]
  pageLayout.beforeBody = [SidebarToggle, ...(pageLayout.beforeBody ?? [])]
}

// YAML loading creates its own dispatcher before these local overrides exist.
// Replace that instance so both page rendering and resource collection use them.
config.plugins.emitters = config.plugins.emitters.filter(
  (emitter) => emitter.name !== "PageTypeDispatcher",
)
config.plugins.emitters.push(PageTypeDispatcher(layout))
