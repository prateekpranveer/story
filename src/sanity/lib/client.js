import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId, write_token } from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: write_token,
  useCdn: false, // Set to false if statically generating pages, using ISR or tag-based revalidation
})
