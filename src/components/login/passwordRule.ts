// 비밀번호 규칙 — 가입과 변경이 같다(서버 규칙): 공백 없는 ASCII 8~72자, 영문·숫자·특수문자 모두 포함
export const PW_MAX = 72
export const pwChecks = (pw: string) => [pw.length >= 8, /[A-Za-z]/.test(pw) && /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)]
// 한글·공백이 섞이지 않았는가(서버는 \x21-\x7E 만 받는다)
export const pwCharsOk = (pw: string) => /^[\x21-\x7E]*$/.test(pw)
export const pwOk = (pw: string) => pw.length <= PW_MAX && pwCharsOk(pw) && pwChecks(pw).every(Boolean)
