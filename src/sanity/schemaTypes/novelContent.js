// /schemas/novelContent.js
import { defineType } from 'sanity';

export const novelContentType = defineType({
  name: "novelContent",
  title: "Novel Content",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
    },
    {
      name: "content",
      title: "Content",
      type: "text",
    },
  ],
});
