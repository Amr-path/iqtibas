export type UserBook = {
  id: string
  user_id: string
  book_id: string
  quotes_count: number
  images_count: number
  added_at: string
  books: Book
}

export type Book = {
  id: string
  title: string
  author: string
  isbn?: string
  cover_url?: string
  published_year?: number
  publisher?: string
  page_count?: number
  description?: string
  language?: string
  google_books_id?: string
}

export type Image = {
  id: string
  user_id: string
  book_id: string
  storage_path: string
  public_url: string
  file_name: string
  status: 'uploaded' | 'processing' | 'processed' | 'error'
  page_number?: number
  created_at: string
}

export type ExtractedText = {
  id: string
  image_id: string
  full_text: string
  confidence_score?: number
  ocr_provider: string
  extracted_at: string
}

export type Quote = {
  id: string
  user_id: string
  book_id: string
  image_id: string
  extracted_text_id?: string
  text: string
  page_number?: number
  tags: string[]
  is_favorite: boolean
  created_at: string
  books?: Book
  images?: Image
}
