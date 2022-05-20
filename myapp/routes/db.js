const mysql = require('mysql'); // package인 mysql을 모듈로 불러옴

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '!DOGLIKEepdlxjqpdltm!',
    port: 3306,
    database: 'mydb', //접속하려는 데이터베이스이름
    dateStrings: 'date' // 이제 '년월일시분초'를 제외한 정보는 출력안함
}); // 이 데이터형태는 지켜져야한다

function getAllMemos(callback){
    // SELECT * FROM MEMOS ORDER BY ID DESC: ID내림차순으로 메모테이블의 모든 행을 출력하라
    connection.query(`SELECT book.name, book.price, book.book_no FROM mydb.book`, (err, rows) => {
        connection.query(`SELECT Book_book_no, book.name, sold_mount FROM bestseller INNER JOIN book ON book_no = Book_book_no WHERE bestseller.month = date_format(curdate(), '%Y%m') order by sold_mount DESC`, (err, result) => {
            callback(rows, result);
        }); // rows(쿼리결과) 반환
    }); // callback함수형태로 쿼리를 전해주어야 mysql에서 온전히 view로 받아올 수 있음
}

function insertMemo(content, callback) {
    connection.query(`INSERT INTO MEMOS(CONTENT, CREATED_AT, UPDATED_AT) VALUES ("${content}", NOW(), NOW())`, (err, result) => {
        if(err) throw err;
        callback();
    })
}

function getMemoById(id, callback) {
    connection.query(`SELECT * FROM MEMOS WHERE ID=${id}`, (err, row, fields)=> {
        if(err) throw err;
        callback(row);
    });
}

function updateMemoById(id, content, callback) {
    connection.query(`UPDATE MEMOS SET CONTENT="${content}", UPDATED_AT=NOW() WHERE ID=${id}`, (err, result) => {
        if(err) throw err;
        callback();
    })
}

function deleteMemoById(id, callback) {
    connection.query(`DELETE FROM MEMOS WHERE ID=${id}`, (err, result) => {
        if(err) throw err;
        callback();
    });
}

function trylogin(member_name, password, callback) {
    connection.query(`SELECT EXISTS (SELECT member_name, member_password FROM mydb.member WHERE member_name='${member_name}' AND member_password='${password}') as SUC`, (err, rows) => {
        if(err) throw err;
         // 자료형은 배열안의 object가 리스트 형태로 나온다
        callback(rows);
    });
}

function tryRegister(member_name, password, callback) {
    connection.query(`SELECT EXISTS (SELECT member_name, member_password FROM mydb.member WHERE member_name='${member_name}' AND member_password='${password}') as exts`, (err, rows) => {
        if(err) throw err;
        callback(rows);
        // 비밀번호에 대한 제한 추가 필요
    });
}

function RegisterMember(member_name, password, callback) {
    getHighestMember_no((hmn)=>{
        var highestNumber = hmn[0]['max(member_no)'] + 1;
        console.log(highestNumber);
        connection.query(`INSERT INTO mydb.member(member_no, member_name, member_password) VALUES(${highestNumber}, '${member_name}', '${password}')`, (err, rows)=>{
            //nothing to do
        });
    });
    callback();
}
function getHighestMember_no(callback) {
    connection.query(`SELECT max(member_no) FROM member as hmn`, (err, rows) => {
        callback(rows);
    });
}

function getMember_no(member_name, password, callback) {
    connection.query(`SELECT member_no FROM member WHERE member_name='${member_name}' AND member_password='${password}'`, (err, rows) => {
        callback(rows);
    });
}

function getCartlist(member_no, callback) {
    connection.query(`SELECT Book.name, cart_detail.cart_quantity AS qtt, (Book.price*cart_detail.cart_quantity) AS subtotal, book_no FROM member INNER JOIN cart ON cart.MEMBER_member_no = member.member_no INNER JOIN cart_detail ON Cart_cart_no = cart.cart_no INNER JOIN book ON book.book_no = cart_detail.Book_book_no WHERE member_no = ${member_no}`, (err, rows, field) => {
        callback(rows, field); // 책 이름, 수량, 소계, 책 번호
    });
}

function getHighestCartNumber(callback) {
    connection.query(`SELECT max(cart.cart_no) FROM cart`, (err, result) => {
        if(result) {
            result = result[0]['max(cart.cart_no)'];
            callback(result);
        } else {
            result = null;
            callback(result);
        }
    });
}

function AddtoCart(member_no, book_no, callback) {
    memberCartExists(member_no, (exts) => {
       if (exts == 1) { // 멤버가 카트를 가지고 있다!
        bookexists(member_no, book_no, (exts2)=>{ // 카트가 존재하며, 카트안에 추가하려는 책이 있는지 여부를 묻는다
            if(exts2 == 0) { // 책이 없다. 그렇다면 같은 카트 번호를 가지고 다른 책의 데이터를 집어넣는다.
                // 현재 사용자의 카트넘버 아무거나 가져온다.
                connection.query(`SELECT cart_no FROM cart WHERE MEMBER_member_no = ${member_no} order by createdDate DESC`, (err, result) => {
                    // console.log(result + " |11 " + result[0]['cart_no']);
                    var cartnumber = result[0]['cart_no'];
                    // 해당 카트넘버에 책 번호를 이용해 데이터를 추가한다(수량:1, 가격: 북 테이블참조)
                    connection.query(`INSERT INTO cart_detail VALUES(${cartnumber}, ${book_no}, 1, (SELECT price FROM book WHERE book_no=${book_no}))`, (err) => {
                        //something to do?
                    })
                });
            } else if (exts2 == 1){ // 책이 이미 카트에 있다.
                // 책이 있는 카트를 찾아야한다. 가장 최신걸로
                connection.query(`SELECT cart.cart_no FROM cart_detail INNER JOIN cart ON cart_no = Cart_cart_no WHERE MEMBER_member_no = ${member_no} AND Book_book_no = ${book_no} order by cart_no DESC`, (err, result) => {
                    var ctn = result[0]['cart_no'];
                    if( ctn > 0 ){
                        // 책이 존재하는 카트를 찾았다. 이제 해당 책의 수량을 1개 추가할 차례다. 연달아 소계도 업데이트해주어야한다.
                        connection.query(`UPDATE cart_detail SET cart_quantity = cart_quantity + 1, cart_price = (SELECT price FROM book WHERE book_no=${book_no}) * cart_quantity WHERE Book_book_no = ${book_no} AND Cart_cart_no=${ctn}`, (err) => {
                            if(err) throw err;
                        })
                    }
                });
            }
        });
       } else { // 멤버가 카트를 가지고 있지 않다!
            var cartnumber;
            getHighestCartNumber((CN)=>{ // 새로운 카트를 INSERT하기위해서 준비한다
                if(CN) {
                    cartnumber = CN + 1;
                }else {
                    cartnumber = 8888001;
                }
                connection.query(`INSERT INTO cart VALUES(${cartnumber}, date_format(now(), '%Y%m'), ${member_no})`, (err) => {
                    if(err) console.log(err);
                    connection.query(`INSERT INTO cart_detail VALUES(${cartnumber}, ${book_no}, 1, (SELECT book.price FROM book WHERE Book.book_no = ${book_no}))`, (err) => {
                        if(err) console.log(err);
                    }); 
                });
            });
       }
    });
    callback();
}

// 멤버의 번호와 책 번호를 넣어서 카트에 책이 존재하는지 찾고 반환하는 함수
function bookexists(member_no, book_no, callback) {
    connection.query(`SELECT EXISTS (SELECT cart.cart_no, cart.createdDate FROM cart INNER JOIN cart_detail ON cart.cart_no = cart_detail.Cart_cart_no WHERE MEMBER_member_no = ${member_no} AND Book_book_no=${book_no}) AS exts`, (err, result) => {
        console.log(result[0]['exts']);
        if (result[0]['exts'] == 1) { // 책이 존재한다면
            callback(1);
        } else if (result[0]['exts'] == 0){ // 카트에 해당 책이 존재하지 않는다면
            callback(0);
        }
    });
}

function memberCartExists(member_no, callback) {
    connection.query(`SELECT EXISTS (SELECT cart_no FROM cart WHERE MEMBER_member_no = ${member_no}) AS exts2`, (err, result) => {
        callback(result[0]['exts2']); // 기대값: 1(존재), 0(없음)
    });
}

function DeletebookFromCart(member_no, book_number, callback) { // ViewCart에서 Delete버튼으로 불러지는 함수이다.
    // 멤버의 Cart에서 가장 오래된 카트에서 책을 삭제해야한다
    connection.query(`SELECT cart_no, createdDate FROM cart INNER JOIN cart_detail ON Cart_cart_no = cart_no WHERE MEMBER_member_no = ${member_no} AND Book_book_no = ${book_number} order by createdDate ASC`, (err, result) => {
        var ctn = result[0]['cart_no'];
        // console.log(ctn);
        connection.query(`DELETE FROM cart_detail WHERE Cart_cart_no = ${ctn} AND Book_book_no = ${book_number}`, (err)=>{
            if(err) throw err;
        })
    });
    callback();
}

function AddQtt(member_no, book_no, callback) {
    connection.query(`SELECT cart_no FROM cart_detail INNER JOIN cart ON cart_no = Cart_cart_no WHERE MEMBER_member_no = ${member_no} AND Book_book_no = ${book_no} order by cart_no DESC`, (err, result)=>{
        var ctn = result[0]['cart_no'];
        // console.log(member_no +" | "+ book_no +" | "+ ctn );
        connection.query(`UPDATE cart_detail SET cart_quantity = cart_quantity + 1 WHERE Cart_cart_no = ${ctn} AND Book_book_no = ${book_no}`, (err) => {});
    });
    callback();
}

function SubQtt(member_no, book_no, callback) {
    connection.query(`SELECT cart_no, cart_quantity FROM cart_detail INNER JOIN cart ON cart_no = Cart_cart_no WHERE MEMBER_member_no = ${member_no} AND Book_book_no = ${book_no} order by cart_no DESC`, (err, result)=>{
        var ctn = result[0]['cart_no'];
        var cqtt = result[0]['cart_quantity'];
        // console.log(member_no +" | "+ book_no +" | "+ ctn );
        if(cqtt == 1) {
            callback();
        } else {
            connection.query(`UPDATE cart_detail SET cart_quantity = cart_quantity - 1 WHERE Cart_cart_no = ${ctn} AND Book_book_no = ${book_no}`, (err) => {});
            callback();
        }
    });
}
function SubQtt_beforeChk(member_no, book_no, callback) {
    connection.query(`SELECT cart_quantity FROM cart_detail INNER JOIN cart ON cart_no = Cart_cart_no WHERE MEMBER_member_no = ${member_no} AND Book_book_no = ${book_no} order by cart_no DESC`, (err, result) => {
        var cqtt = result[0]['cart_quantity'];
        callback(cqtt);
    });
}

function AddAddress(member_no, zipcode, address1, addresss2, callback) {
    haveMemberAdrress(member_no, (exts) => {
        if(exts == 0) { // 멤버의 주소가 존재하지 않는다면
            connection.query(`INSERT INTO address(zipcode, address1, address2, MEMBER_member_no) VALUES(${zipcode}, '${address1}', '${addresss2}', ${member_no})`, (err) => {
                if(err) throw err;
                chk = true;
                callback(chk);
            });
        } else {
            chk = false;
            callback(chk);
        }
    });
}
function haveMemberAdrress(member_no, callback) {
    connection.query(`SELECT EXISTS (SELECT * FROM address WHERE MEMBER_member_no = ${member_no}) AS exts`, (err, result)=>{
        callback(result[0]['exts']);
    });
}

function AddCreditcard(member_no, cardNumber, expireDate, cardType, callback) {
    connection.query(`INSERT INTO card(cardNumber, expireDate, cardType, MEMBER_member_no) VALUES(${cardNumber}, ${expireDate}, '${cardType}', ${member_no})`, (err) => {
        if(err) {console.log(err)};
        callback();
    });
}

function getMypageInfomations(member_no, callback) {
    connection.query(`SELECT * FROM card WHERE MEMBER_member_no = ${member_no}`, (err, rows1) => {
        var card_rows = rows1;
        connection.query(`SELECT * FROM address WHERE MEMBER_member_no = ${member_no}`, (err, rows2) => {
            var address_rows = rows2;
            callback(address_rows, card_rows);
        });
    });
}

function getMyOrderList(member_no, callback) {
    connection.query(`SELECT * FROM mydb.order WHERE MEMBER_member_no = ${member_no}`, (err, result) => {
        callback(result);
    });
}

function getMyDetailOrderList(order_no, callback) {
    connection.query(`SELECT Order_order_no, book.name, order_price, order_quantity 
    FROM mydb.book INNER JOIN mydb.order_detail ON Book_book_no = book_no 
    WHERE Order_order_no = ${order_no}`, (err, result) =>{ 
        callback(result);
    });
}

function orderCart(member_no, callback) {
    getCartlist(member_no, (rows, fields) => {
        var order_total = 0;
        var HighestOrder_no = 0;

        for(var i=0; i<rows.length; i++) {
            order_total += rows[i]['subtotal'];
        }
        getHighestOrder_no((HON)=> {
            HighestOrder_no = HON + 1;
            const sql = `INSERT INTO mydb.order VALUES(
                ${HighestOrder_no},
                date_format(curdate(), '%Y%m'),
                ${order_total},
                (SELECT cardNumber FROM card WHERE MEMBER_member_no = ${member_no}),
                (SELECT cardType FROM card WHERE MEMBER_member_no = ${member_no}),
                (SELECT expireDate FROM card WHERE MEMBER_member_no = ${member_no}),
                (SELECT zipcode FROM address WHERE MEMBER_member_no = ${member_no}),
                (SELECT address1 FROM address WHERE MEMBER_member_no = ${member_no}),
                (SELECT address2 FROM address WHERE MEMBER_member_no = ${member_no}),
                ${member_no});
            `
            connection.query(sql, (err) => {
                if(err) {
                    console.log(err);
                } else {
                    for(var j=0; j<rows.length; j++) {
                        var booknumber = rows[j]['book_no'];
                        var qtt = rows[j]['qtt'];
                        var subtotal = rows[j]['subtotal'];
                        const sql_orderdetail = `INSERT INTO order_detail values(
                            ${HighestOrder_no},
                            ${booknumber} ,
                            ${qtt},
                            ${subtotal});
                        `
                        connection.query(sql_orderdetail, (err) => {
                            connection.query(`UPDATE book SET quantity=quantity-${qtt} WHERE book_no=${booknumber};`, (err) => {
                                if(err) throw err;
                                connection.query(`DELETE FROM cart WHERE MEMBER_member_no = ${member_no}`, (err) => {
                                    if(err) throw err;
                                    UpdateBestSeller(booknumber, qtt, true, () => {})
                                });
                            });
                        });
                    }
                }
            });
        });
    });
}
// 주문이 완료되었으면 카트에 있는것 삭제
// 북 재고량에서 차감
// 베스트셀러(판매량)에 데이터 추가

function CancelOrder(order_no, callback) {
    var book_no, qtt;
    connection.query(`SELECT Book_book_no, order_quantity FROM mydb.order_detail WHERE Order_order_no = ${order_no}`, (err, result) => {
        if(err) throw err;
        for(var i=0; i<result.length; i++) {
            book_no = result[i]['Book_book_no'];
            qtt = result[i]['order_quantity'];
            connection.query(`UPDATE book SET quantity=quantity+${qtt} WHERE book_no=${book_no}`, (err) => { // 재고량에 다시 더함
                if(err) throw err;
                 connection.query(`UPDATE bestseller SET sold_mount=sold_mount-${qtt} WHERE Book_book_no=${book_no}`, (err) => { // 베스트 셀러의 판매량에서 차감
                    if(err) throw err;
                    connection.query(`DELETE FROM mydb.order WHERE order_no=${order_no}`, (err) => { // 주문 삭제
                        if(err) throw err;
                        
                    });
                });
            });
        }
    });
    // 주문 번호로 판매량 조회 후 재고량에 다시 그만큼 더하고
    // 베스트 셀러에서 판매량에서 뺀 다음
    // 이 주문에 관한 데이터 삭제
}

function getHighestOrder_no(callback) {
    connection.query(`SELECT max(order_no) from mydb.order`, (err, result) =>{
        if(err) console.log(err);
        callback(result[0]['max(order_no)']);
    });
}

function UpdateBestSeller(book_no, qtt, isAdd, callback) {
    if(isAdd) { // isAdd는 판매량에 더하는것인지(true) 빼는것인지(false) 체크함
        // 책이 있는지 없는지 확인 후 업데이트
        connection.query(`SELECT EXISTS (SELECT * FROM bestseller WHERE Book_book_no = ${book_no}) AS exts`, (err, result) => {
            if(err) throw err;
            result = result[0]['exts'];
            var sql;
            if(result == 1) { // 책이 있다면
                sql = `UPDATE bestseller SET sold_mount = sold_mount + ${qtt} WHERE Book_book_no = ${book_no}`;
            } else { // 책이 없다면
                sql = `INSERT INTO bestseller VALUES(date_format(now(), '%Y%m'), ${qtt}, ${book_no})`;
            }
            connection.query(sql, (err, result) => {
                if(err) throw err;
                callback();
            });
        });
    } else { // 주문 취소. 책이 없는 지 확인 불필요
        connection.query(`UPDATE bestseller SET sold_mount = sold_mount - ${qtt} WHERE Book_book_no = ${book_no}`, (err) => {
            if(err) throw err;
            callback();
        });
    }
    
}

module.exports = {
    getAllMemos,
    insertMemo,
    getMemoById,
    updateMemoById,
    deleteMemoById,
    trylogin,
    tryRegister,
    RegisterMember,
    getMember_no,
    getCartlist,
    DeletebookFromCart,
    AddtoCart,
    AddQtt,
    SubQtt,
    SubQtt_beforeChk,
    AddAddress,
    AddCreditcard,
    getMypageInfomations,
    getMyOrderList,
    getMyDetailOrderList,
    orderCart,
    CancelOrder
}