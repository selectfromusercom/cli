# openselect

### 셀렉트클라우드 공식 CLI

셀렉트 클라우드에서 어드민을 만들때 자체 로컬환경, 에디터를 이용할 수 있도록 인터페이스를 제공합니다. 복잡한 설치나 연동 없이 CRUD를 완성하는 목적을 달성하면서, 본인의 자유로운 환경을 그대로 이용 가능하는 것을 목표로 만들어졌습니다. 아직은 로컬 데이터베이스, API를 연결 하도록 바로 지원하지 않지만 ngrok등을 이용해 쉽게 가능합니다. (무료로)

제공
selectfromuser.com 

### 사용법

- `npm i -g @selectfromuser/cli`
- `slt login`
- `slt init`
- `slt` (`slt dev`와 동일)

### YAML 파일

로컬 결과물을 바로 볼수있도록 클라우드 해당 팀으로 preview URL이 발급됩니다.

파일, 폴더 변경으로 watch-reload 합니다.

### Directory-based routing

내용 추가 예정