# BookstoreExample
DB 과제로 만든것. MySQL + Node.js로 구성

개선 방향: 
MySQL Connection에서 연결 상태의 연결, 마침을 제대로 해주지 않아서 실제 데이터베이스에 수정되고 표시되기까지의 시간의 딜레이가 존재하는 문제
-> 같은 기능을 연결의 맺음과 끊음을 정확히해 라이프 사이클을 생성하고, 데이터베이스까지 적용되기까지의 속도를 줄일 수 있도록

다중 사용자의 경우 세션을 이용해서 구현
