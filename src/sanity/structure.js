export const structure = (S) =>
  S.list()
    .title('Novel Writing App')
    .items([
      // Show Novel Content documents
      S.documentTypeListItem('novelContent').title('Novel Content'),
      S.divider(),
      // Show any other document types, if they exist
      ...S.documentTypeListItems().filter(
        (item) => item.getId() && !['novelContent'].includes(item.getId())
      ),
    ]);