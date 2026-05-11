# PWA 아이콘 (WorshipSync)

`manifest.json`과 iOS 홈 화면 추가에 사용합니다.

## 권장 PNG (필수에 가깝게 준비)

| 파일            | 크기      | 용도                                      |
|-----------------|-----------|-------------------------------------------|
| `icon-192.png`  | **192×192** | Android/Chrome 설치 배너, 일부 스플래시 |
| `icon-512.png`  | **512×512** | 설치형 PWA, 고해상도 런처                |

- 배경은 브랜드에 맞게 단색 또는 간단한 심볼.
- `maskable` 용도로 쓸 때는 **중요한 그래픽을 안전 영역(중앙 약 80%)** 안에 두세요.

## SVG

- `icon.svg` — 벡터 fallback (`sizes: any`). iOS는 여전히 PNG를 선호하므로 위 PNG를 함께 두는 것을 권장합니다.

## 생성 도구 예시

- [RealFaviconGenerator](https://realfavicongenerator.net/)
- Figma/Illustrator에서 512×512 마스터를 만든 뒤 192로 리사이즈

이 폴더에 PNG를 추가하기 전까지는 SVG만으로도 개발·내부 테스트는 가능합니다.
