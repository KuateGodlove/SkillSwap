const fs = require('fs');
const https = require('https');
const zlib = require('zlib');

function encode64(data) {
  let r = "";
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 === data.length) {
      r += append3bytes(data[i], data[i + 1], 0);
    } else if (i + 1 === data.length) {
      r += append3bytes(data[i], 0, 0);
    } else {
      r += append3bytes(data[i], data[i + 1], data[i + 2]);
    }
  }
  return r;
}

function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3F;
  let r = "";
  r += encode6bit(c1 & 0x3F);
  r += encode6bit(c2 & 0x3F);
  r += encode6bit(c3 & 0x3F);
  r += encode6bit(c4 & 0x3F);
  return r;
}

function encode6bit(b) {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return '-';
  if (b === 1) return '_';
  return '?';
}

function encodePlantUml(puml) {
  const deflated = zlib.deflateRawSync(Buffer.from(puml, 'utf8'));
  return "~1" + encode64(deflated);
}

const uml = `@startuml
left to right direction
skinparam packageStyle rectangle
skinparam rectangle {
    BackgroundColor LightBlue
}
skinparam usecase {
    BackgroundColor Azure
    BorderColor RoyalBlue
}

actor "Guest" as Guest
actor "Client" as Client
actor "Provider" as Provider
actor "Admin" as Admin
actor "Payment API" as PaymentAPI

Client -|> Guest
Provider -|> Guest

rectangle "SKILLSWAPP USE CASE" {
  
  usecase "View Dashboard" as UC_Guest_1
  usecase "View Service Details" as UC_Guest_2
  usecase "Browse Services" as UC_Guest_3
  usecase "Create account" as UC_Guest_4

  usecase "Authentication" as UC_Auth
  
  Guest --> UC_Guest_1
  Guest --> UC_Guest_2
  Guest --> UC_Guest_3
  Guest --> UC_Guest_4

  usecase "Upload files" as UC_Client_1
  usecase "Chat with provider" as UC_Client_2
  usecase "Post RFQ" as UC_Client_3
  usecase "Accept Quote" as UC_Client_4
  usecase "Create Order" as UC_Client_5
  usecase "Reject Quote" as UC_Client_6
  usecase "Rate & Review" as UC_Client_7
  usecase "Edit profile" as UC_Client_8
  usecase "Make Escrow Payment" as UC_Client_9
  usecase "Pay Subscription Fee" as UC_Client_10
  usecase "Make payment" as UC_MakePayment
  
  Client --> UC_Client_1
  Client --> UC_Client_2
  Client --> UC_Client_3
  Client --> UC_Client_4
  Client --> UC_Client_5
  Client --> UC_Client_6
  Client --> UC_Client_7
  Client --> UC_Client_8
  Client --> UC_Client_9
  Client --> UC_Client_10

  UC_Client_1 ..> UC_Auth : <<include>>
  UC_Client_2 ..> UC_Auth : <<include>>
  UC_Client_3 ..> UC_Auth : <<include>>
  UC_Client_4 ..> UC_Auth : <<include>>
  UC_Client_5 ..> UC_Auth : <<include>>
  UC_Client_6 ..> UC_Auth : <<include>>
  UC_Client_7 ..> UC_Auth : <<include>>
  UC_Client_8 ..> UC_Auth : <<include>>
  UC_Client_9 ..> UC_Auth : <<include>>
  UC_Client_10 ..> UC_Auth : <<include>>

  UC_Client_9 ..> UC_MakePayment : <<include>>
  UC_Client_10 ..> UC_MakePayment : <<include>>

  usecase "OM" as UC_OM
  usecase "MOMO" as UC_MOMO
  UC_OM .> UC_MakePayment : <<extend>>
  UC_MOMO .> UC_MakePayment : <<extend>>

  usecase "Submit Quote" as UC_Prov_1
  usecase "Manage Service Listings" as UC_Prov_2
  usecase "Manage Membership" as UC_Prov_3
  usecase "Withdraw Earnings" as UC_Prov_4
  usecase "Manage transactions" as UC_Prov_5
  usecase "Pay Membership Fee" as UC_Prov_6

  Provider --> UC_Prov_1
  Provider --> UC_Prov_2
  Provider --> UC_Prov_3
  Provider --> UC_Prov_4
  Provider --> UC_Prov_5
  Provider --> UC_Prov_6

  UC_Prov_1 ..> UC_Auth : <<include>>
  UC_Prov_2 ..> UC_Auth : <<include>>
  UC_Prov_3 ..> UC_Auth : <<include>>
  UC_Prov_4 ..> UC_Auth : <<include>>
  UC_Prov_5 ..> UC_Auth : <<include>>
  UC_Prov_6 ..> UC_Auth : <<include>>

  usecase "Orange money" as UC_Prov_OM
  usecase "Mobile money" as UC_Prov_MOMO

  UC_Prov_OM .> UC_Prov_6 : <<extend>>
  UC_Prov_MOMO .> UC_Prov_6 : <<extend>>

  usecase "Manage Users" as UC_Admin_1
  usecase "Approve Providers" as UC_Admin_2
  usecase "Analytics" as UC_Admin_3
  usecase "Handle Disputes" as UC_Admin_4
  usecase "Manage Platform Settings" as UC_Admin_5

  Admin --> UC_Admin_1
  Admin --> UC_Admin_2
  Admin --> UC_Admin_3
  Admin --> UC_Admin_4
  Admin --> UC_Admin_5

  UC_Admin_1 ..> UC_Auth : <<include>>
  UC_Admin_2 ..> UC_Auth : <<include>>
  UC_Admin_3 ..> UC_Auth : <<include>>
  UC_Admin_4 ..> UC_Auth : <<include>>
  UC_Admin_5 ..> UC_Auth : <<include>>
}

UC_MakePayment -- PaymentAPI

@enduml`;

const encoded = encodePlantUml(uml);
const url = "https://www.plantuml.com/plantuml/png/" + encoded;

https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error('Failed to download image. Status code:', res.statusCode);
        return;
    }
    const file = fs.createWriteStream('C:\\\\Users\\\\GODLOVE\\\\Desktop\\\\Updated_SkillSwapp_UseCase.png');
    res.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log('Saved Updated_SkillSwapp_UseCase.png to Desktop');
    });
}).on('error', (err) => {
    console.error('Error downloading:', err.message);
});
