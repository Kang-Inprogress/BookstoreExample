var express = require('express');
var router = express.Router();
const db = require('./db'); // db.js
const url = require('url');
// express-validator 모듈에서 check와 validationResult함수를 사용한다
// check: 유효성 검사항 데이터 특정, 조건 제한 가능
// validationResult는 에러가 발생하면 해당 에러 내용을 반환해 주는 역할을 한다
const {check, validationResult} = require('express-validator'); 

let logined_member;
let logined_member_password;
let logined_member_number;

/* GET home page. */
router.get('/', (req, res, next) =>{
  res.render('login');
});

router.get('/index', (req, res, next) => {
  db.getAllMemos((rows, result) => { 
    var bestsellers = result.slice(0, 3); // 3개 까지만
    res.render('index', {rows: rows, bestsellers: bestsellers});  //rows: 기본 책 정보, result: 베스트셀러정보
  });
});

router.get('/AddtoCart', (req, res) => {
  var book_no = req.query.BookNumber;
  db.AddtoCart(logined_member_number, book_no, () => {
    res.redirect('/viewCart');
  });
});

router.get('/viewCart', (req, res, next) => {
  db.getCartlist(logined_member_number, (rows, field) => {
    //for(var row in rows) { console.log(rows[row]); } //뭐뭐 나오는지 확인할 수 있는것
    if(rows.length > 0) {
      res.render('viewCart', {rows: rows});
    } else {
      res.redirect('/nocart');
    }
  });
});

router.get('/nocart', (req, res) => {
  res.send('you have no book on cart now!');
});

router.get('/newMemo', function(req, res, next){
  res.render('newMemo');
});

router.post('/memberlogin', (req, res, next) =>{
  // json stringify 해야 스트링으로 받는다
  let member_name = req.body['member_name'];
  let member_password = req.body['password'];
  
  if(member_name.length > 0 && member_password > 0)
  {
    db.trylogin(member_name, member_password, (result)=>{
      result = result[0];
      result = result['SUC'];
      if(result == '1') {
        res.redirect('/index');
        logined_member = member_name;
        logined_member_password = member_password;
        db.getMember_no(logined_member, logined_member_password, (number)=>{
          logined_member_number = number[0]['member_no'];
        });
      } else {
        res.redirect('/');
      }
    });
  } else {
    res.redirect('/');
  }
});

router.get('/register', (req, res, next) => {
  res.render('register');
});

router.post('/register', (req, res, next) => {
  let member_name = req.body['member_name'];
  let member_password = req.body['password'];

  db.tryRegister(member_name, member_password, (CHK) => {
    CHK = CHK[0]['exts'];
    if(CHK == 1)
    {
      res.redirect('/');
      console.log("no login!!!@!@!@!");
    } else {
      db.RegisterMember(member_name, member_password, () => {
        console.log("success");
      });
      res.redirect('/');
    }
  });

});

router.post('/store', [check('content').isByteLength({min:1, max:500})], function(req, res, next){ //content의 문자열의 바이트 길이가 1 이상 500 이하 인지를 검사
  let errs = validationResult(req);
  if(errs['errors'].length > 0) { // 에러가 있으면 출력되고 없으면 존재하지 않기떄문에 정상 출력이 된다
    res.render('newMemo', {errs: errs['errors']});
  } else {
    let param = JSON.parse(JSON.stringify(req.body));
    db.insertMemo(param['content'], () => {
      res.redirect('/index');
    })
  }
});

router.get('/DeletebookFromCart', (req, res) => {
  var BN = req.query.BookNumber;
  db.DeletebookFromCart(logined_member_number, BN, () => {
    db.getCartlist(logined_member_number, (rows, field) => {
      if(rows.length > 0) { 
        res.redirect('/viewCart');
      } else {
        res.redirect('/nocart');
      }
    });
  });
});

router.get('/AddQtt' , (req, res) => { // 여부검사 필요없음 viewCart에서 왔기때문에
  var BN = req.query.BookNumber;
  db.AddQtt(logined_member_number, BN, ()=>{
    res.redirect('/viewCart');
  });
});

router.get('/SubQtt' , (req, res) => { // 여부검사 필요없음 viewCart에서 왔기때문에
  var BN = req.query.BookNumber;
  db.SubQtt_beforeChk(logined_member_number, BN, (cqtt)=>{
    if(cqtt > 0){
      db.SubQtt(logined_member_number, BN, ()=>{
        res.redirect('/viewCart');
      });
    } else {
      res.send('No more Sub under 1');
    }
  });
});

router.get('/OrderCart', (req, res) => {
  // OrderCart를 누르면 주문 페이지에서 member_no값으로 카트에 있는 값을 모두 불러와서 주문하면 되는거
  db.orderCart(logined_member_number, () => {
    
  });
  res.redirect('OrderedList');
});

router.get('/OrderedList', (req, res) => {
  db.getMyOrderList(logined_member_number, (ol) => {
    var orderlist = ol;
    // orderlist.forEach((row, index) => {
    //   console.log(row);
    // });
    res.render('OrderedList', {rows: orderlist});
  });
});

router.get('/OrderedList_detail', (req, res) => {
  var orderNumber = req.query.order_no;
  
  db.getMyDetailOrderList(orderNumber, (order_details) => {
    var total = 0;
    for(var i=0; i<order_details.length; i++) {
      // console.log(order_details[i]);
      total += order_details[i]['order_price'];
    }
    res.render('OrderedList_detail', {rows:order_details, total: total, orderNumber:orderNumber});
  });
  
});

router.get('/CancelOrder', (req, res) => {
  var order_no = req.query.order_no;
  db.CancelOrder(order_no, () => {
    res.redirect('OrderedList');
  });
});


router.get('/AddAddresses', (req, res) => {
  res.render('addressRegister');
});

router.post('/AddAddress', (req, res) => {
  var zipcode = req.body.zipcode;
  var addr1 = req.body.address1;
  var addr2 = req.body.address2;
  // console.log(zipcode + " | " + addr1 + " | " + addr2);
  // console.log(addr2.length);

  if(zipcode.length == 0 ||  addr1.length == 0 || addr2.length == 0) { // addr2까지 모두 기입해야함
    res.send('should fill zipcode and address 1st');
  } else {
    db.AddAddress(logined_member_number, zipcode, addr1, addr2, (chk) => {
      if(chk == false){
        res.send('You already have');
      } else {
        res.redirect('/index');
      }
    });
  }
});

router.get('/AddCard', (req, res) => {
  res.render('cardRegister');
});

router.post('/Addcard', (req, res) => {
  var cardNumber = req.body.CardNumber;
  var cardExpire = "20" + req.body.expireDate_year + req.body.expireDate_month; // 예시: 202511(2025년 11월)
  var cardType = req.body.CardType;

  if (cardNumber.length == 16) { // 카드번호는 16자리여야한다
    db.AddCreditcard(logined_member_number, cardNumber, cardExpire, cardType, () => {
      res.redirect('index');
    });
  } else {
    res.send('card number length should be 16');
  }
});

router.get('/myPage', (req, res) => {
  db.getMypageInfomations(logined_member_number, (address_rows, card_rows) => {
    // view에 대한 지역 변수로 두 행을 줌
    // console.log(address_rows); 
    // console.log(card_rows);
    res.render('myPage', {rows1: address_rows, rows2: card_rows}); // rows는 배열+객체로 되어있다
  });
});

router.get('/updateMemo', (req, res) => {
  // views/index.ejs에서 row를 순회하면서 각 row의 id값을 파라미터로 /updateMemo요청을 보냄
  // 따라서 routes/index.js에서는 req.query.id를 통해 전달받은 파라미터 값 id를 변수 let id에 저장
  let id = req.query.id;

  db.getMemoById(id, (row) =>{
    if(typeof id === "undefined" || row.length <= 0) { // id가 제대로 되지 않았거나 내용이 없다면 오류
      res.status(404).json({error: "undefined memo"});
    } else {
      res.render("updateMemo", {row: row[0]});
    }
  })
});


router.post('/updateMemo', [check('content').isLength({min:1, max:500})],(req, res) => {
  
  let param = JSON.parse(JSON.stringify(req.body)); // 받을 데이터가 복수이므로 json형태로 가공해서 할당
  let id = param['id']; // param의 id값
  let content = param['content']; // param의 변경된 메모내용
  
  let errs = validationResult(req);

  if(errs['errors'].length >0 ) { //화면에 에러 출력
    db.getMemoById(id, (row) => { // 유효성 검사에 적합하지 않으면 정보를 다시 조회 후, updateMemo 페이지를 다시 렌더링한다
      res.render('updateMemo', {row: row[0], errs:errs['errors']});
    });
  } else {
    db.updateMemoById(id, content, () => {
      res.redirect('/');
    });
  }
});

router.get('/deleteMemo', (req, res) => {
  let id = req.query.id;
  db.deleteMemoById(id, () => {
    res.redirect('/');
  });
});

module.exports = router;
