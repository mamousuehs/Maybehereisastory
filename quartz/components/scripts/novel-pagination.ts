// Kept as a resource string: server-side imports must not evaluate browser APIs.
export default `
document.addEventListener("nav", () => {
  const turnPage = (event) => {
    if (event.defaultPrevented || event.repeat || event.isComposing ||
        event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return

    const target = event.target
    if (target && typeof target.closest === "function" && target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), ' +
      '[role="textbox"], [role="combobox"], [role="listbox"], [role="slider"]'
    )) return
    if (document.querySelector('.search-container.active, dialog[open], .navigation-progress')) return
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) return

    const link = event.key === "ArrowLeft"
      ? document.querySelector('.chapter-navigation > div:first-child a')
      : document.querySelector('.chapter-navigation > div:last-child a, .home-entry')
    if (!link) return
    event.preventDefault()
    link.click()
  }
  document.addEventListener("keydown", turnPage)
  window.addCleanup(() => document.removeEventListener("keydown", turnPage))
})
`
