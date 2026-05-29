import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { SpreadsheetBlockView, createDefaultSpreadsheetState, type SpreadsheetNodeAttrs } from '../PivotTable'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spreadsheetBlock: {
      insertSpreadsheetBlock: (attrs?: Partial<SpreadsheetNodeAttrs>) => ReturnType
    }
  }
}

function createNodeAttrs(): SpreadsheetNodeAttrs {
  return createDefaultSpreadsheetState()
}

export const SpreadsheetBlockExtension = Node.create({
  name: 'spreadsheetBlock',

  group: 'block',

  atom: true,

  draggable: true,

  selectable: true,

  addAttributes() {
    const attrs = createNodeAttrs()
    return {
      sheetId: { default: attrs.sheetId },
      blockId: { default: attrs.blockId },
      title: { default: attrs.title },
      mode: { default: attrs.mode },
      config: { default: attrs.config },
      filters: { default: attrs.filters },
      sort: { default: attrs.sort },
      activeMetric: { default: attrs.activeMetric },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-spreadsheet-block]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes, { 'data-spreadsheet-block': 'true' })]
  },

  addCommands() {
    return {
      insertSpreadsheetBlock:
        (attrs) =>
          ({ chain }) => {
            const nextAttrs = { ...createNodeAttrs(), ...attrs }
            return chain()
              .focus()
              .insertContent({
                type: this.name,
                attrs: nextAttrs,
              })
              .run()
          },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(SpreadsheetBlockView)
  },
})

export type { SpreadsheetNodeAttrs }
