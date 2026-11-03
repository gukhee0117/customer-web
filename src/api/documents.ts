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
  let res
  try {
    res = await apiClient.get<Blob>(`/api/customer/documents/${documentIssueId}/download`, { responseType: 'blob' })
  } catch (e) {
    // blob으로 받은 오류 응답({message, code})을 JSON으로 풀어 apiErrorMessage가 읽게 한다
    const r = (e as { response?: { data?: unknown } }).response
    if (r?.data instanceof Blob) r.data = await r.data.text().then(JSON.parse).catch(() => undefined)
    throw e
  }
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000) // 바로 해제하면 일부 브라우저에서 저장이 취소된다
}
