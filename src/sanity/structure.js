// /desk/structure.js
export const structure = (S) =>
  S.list()
    .title('Novel Writing App')
    .items([
      S.documentTypeListItem('novelContent').title('All Articles'),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => item.getId() && item.getId() !== 'novelContent'
      ),
    ]);
