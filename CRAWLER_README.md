# IGA 구조 수집기

npm install
npx playwright install chromium
npm run capture

각 메뉴의 대표 HTML과 전체 페이지 PNG를 captured-templates/에 저장합니다. 로그인은 제외합니다. 사이트가 403을 반환하면 수집이 진행되지 않으며, 접근 제한을 우회하지 않습니다. 메뉴 트리와 수집 결과를 검수해야 합니다.
