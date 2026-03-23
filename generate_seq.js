const fs = require('fs');
const https = require('https');

const authSeq = `sequenceDiagram
    actor U as User
    participant F as System (Frontend)
    participant B as System (Backend)
    participant D as DBMS (Database)
    
    U->>F: Enter email & password
    F->>B: POST credentials
    B->>D: Find user by email
    D-->>B: Return user record
    B->>B: Verify password & status
    alt is invalid
        B-->>F: Error (401/403)
        F-->>U: Show error message
    else is valid
        B->>D: Update last login
        D-->>B: Success
        B-->>F: Return JWT & User data
        F-->>U: Redirect to Dashboard
    end`;

const rfqSeq = `sequenceDiagram
    actor C as Client
    participant F as System (Frontend)
    participant B as System (Backend)
    participant D as DBMS (Database)

    C->>F: Fill and submit RFQ form
    F->>B: POST /api/rfqs (with Auth Token)
    B->>B: Validate request & token
    alt is invalid
        B-->>F: Error message
        F-->>C: Show error
    else is valid
        B->>D: Insert RFQ record
        D-->>B: Return success
        B->>D: Increment Client project stats
        D-->>B: Return success
        B-->>F: Return success & created RFQ
        F-->>C: Redirect to My Projects
    end`;

const getBase64 = (code) => {
    return Buffer.from(JSON.stringify({ code, mermaid: "{\"theme\": \"default\"}" })).toString('base64');
};

const downloadImage = (base64, filename) => {
    return new Promise((resolve, reject) => {
        const url = `https://mermaid.ink/img/${base64}?bgColor=ffffff`;
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error('Failed to download: ' + res.statusCode));
            }
            const file = fs.createWriteStream(filename);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', reject);
    });
};

const run = async () => {
    try {
        await downloadImage(getBase64(authSeq), 'C:\\\\Users\\\\GODLOVE\\\\Desktop\\\\Authentication_Sequence_Diagram.png');
        console.log('Saved Authentication_Sequence_Diagram.png to Desktop');
        await downloadImage(getBase64(rfqSeq), 'C:\\\\Users\\\\GODLOVE\\\\Desktop\\\\Create_RFQ_Sequence_Diagram.png');
        console.log('Saved Create_RFQ_Sequence_Diagram.png to Desktop');
    } catch (e) {
        console.error(e);
    }
};

run();
