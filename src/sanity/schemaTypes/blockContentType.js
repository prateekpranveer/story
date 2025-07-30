import {defineType, defineArrayMember} from 'sanity'
import {ImageIcon} from '@sanity/icons'

/**
 * This is the schema type for block content used in the post document type
 * Importing this type into the studio configuration's `schema` property
 * lets you reuse it in other document types with:
 *  {
 *    name: 'someName',
 *    title: 'Some title',
 *    type: 'blockContent'
 *  }
 */

export const blockContentType = defineType({
    name: "novelContent",
  title: "Novel Content",
  type: "document",
  fields: [
    {
      name: "content",
      title: "Content",
      type: "text",
    },
  ],
})
