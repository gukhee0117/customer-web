import { apiClient } from './client'

// 서버 DocumentType과 같은 값
export type DocType = 'TAX_RELIEF_CERT' | 'NET_PURCHASE_STATEMENT'

interface ApiResponse<T> {
  message: string
  data: T
}

export interface DocumentIssue {
  documentIssueId: number
  accountId: number
  docType: DocType
  issueNo: string
  status: 'ISSUED' | 'REVOKED'
  issuedAt: string
  revokedAt: string | null
}

// 같은 종류가 이미 발급돼 있으면 서버가 새로 만들지 않고 그 발급본을 돌려준다(그래서 '다시 받기'도 이 호출을 쓴다)
export async function issueDocument(docType: DocType): Promise<DocumentIssue> {
  const res = await apiClient.post<ApiResponse<DocumentIssue>>('/api/customer/documents', null, { params: { docType } })
  return res.data.data
}

export async function listDocuments(): Promise<DocumentIssue[]> {
  const res = await apiClient.get<ApiResponse<DocumentIssue[]>>('/api/customer/documents')
  return res.data.data
}

// PDF를 받아 브라우저 저장으로 넘긴다. 파일명은 서버 Content-Disposition이 CORS에 노출되지 않아 직접 정한다
export async function downloadDocument(documentIssueId: number, fileName: string): Promise<void> {
  const res = await apiClient.get<Blob>(`/api/customer/documents/${documentIssueId}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
