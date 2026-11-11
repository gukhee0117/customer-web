import type { CandidateRequest, CandidateSortKey, ParsedFilter, ProductType, SortDirectionKey } from '../../api/stockPackage'

// 후보 보기 조건(화면 상태). 서버 요청(CandidateRequest)으로 바꿔서 쓴다.
// 새 패키지 창의 "후보 찾기"가 이 조건 모양을 쓴다.
export interface FilterState {
  types: ProductType[]
  themes: string[]
  minGrade: number | null
  maxGrade: number | null
  keyword: string
  includeOut: boolean // 내 투자성향 범위 밖 상품도 함께 보기
  sort: CandidateSortKey
  direction: SortDirectionKey
}

// 처음에는 성향으로 거르지 않고 전체 종목을 후보로 보여 준다. 범위 밖 상품은 빼지 않고 "내 성향 밖" 표시만 붙이며, 서버가 범위 안 상품을 먼저 둔다
export const EMPTY_FILTER: FilterState = { types: [], themes: [], minGrade: null, maxGrade: null, keyword: '', includeOut: true, sort: 'NAME', direction: 'ASC' }

// keyword는 입력이 멈춘 뒤의 값을 따로 받는다(글자를 칠 때마다 서버를 부르지 않게)
export function requestOf(f: FilterState, keyword: string): CandidateRequest {
  return {
    ...(f.types.length ? { productTypes: f.types } : {}),
    ...(f.themes.length ? { themes: f.themes } : {}),
    ...(f.minGrade != null ? { minGrade: f.minGrade } : {}),
    ...(f.maxGrade != null ? { maxGrade: f.maxGrade } : {}),
    ...(keyword ? { keyword } : {}),
    includeOutOfProfile: f.includeOut,
    sort: f.sort,
    direction: f.direction
  }
}

// 말로 찾은 조건(서버가 검증한 값)을 필터에 채운다. 정렬을 말하지 않았으면 기본 정렬(가나다순)로 돌린다
export const filterFromParsed = (f: FilterState, p: ParsedFilter): FilterState => ({
  ...f,
  types: p.productTypes,
  themes: p.themes,
  minGrade: p.minGrade,
  maxGrade: p.maxGrade,
  keyword: '',
  sort: p.sort ?? 'NAME',
  direction: p.direction ?? 'ASC'
})

export const toggleIn = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : list.concat(v))
