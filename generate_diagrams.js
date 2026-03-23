const fs = require('fs');
const https = require('https');

const authMmd = `flowchart TD
    classDef startEnd fill:#000,stroke:#000,stroke-width:2px,color:#fff,shape:circle;
    classDef action fill:#60A5FA,stroke:#2563EB,stroke-width:1px,color:#000;
    classDef decision fill:#60A5FA,stroke:#2563EB,stroke-width:1px,color:#000,shape:diamond;
    subgraph User [User]
        direction TB
        Start((( ))) --> NavLogin[Navigate to login page]
        EnterCreds[Fill email and password] --> ClickLogin[Click login button]
        ViewDashboard[Redirected to dashboard]
        End((( ))) 
    end
    subgraph System [System]
        direction TB
        DisplayForm[Display login form]
        ValidateInput[Verify form conformity]
        IsValid{Is Valid?}
        ShowError[Display error message]
        VerifyPass[Verify password and status]
        IsAuth{Verification OK?}
        GenToken[Display success message & return JWT]
    end
    subgraph DBMS [DBMS]
        direction TB
        FindUser[Execute find user query]
        ReturnUser[Return query result]
        UpdateLogin[Execute update last login]
    end
    NavLogin --> DisplayForm
    DisplayForm --> EnterCreds
    ClickLogin --> ValidateInput
    ValidateInput --> IsValid
    IsValid -->|No| ShowError
    ShowError --> EnterCreds
    IsValid -->|Yes| FindUser
    FindUser --> ReturnUser
    ReturnUser --> VerifyPass
    VerifyPass --> IsAuth
    IsAuth -->|No| ShowError
    IsAuth -->|Yes| UpdateLogin
    UpdateLogin --> GenToken
    GenToken --> ViewDashboard
    ViewDashboard --> End
    class Start,End startEnd;
    class NavLogin,EnterCreds,ClickLogin,ViewDashboard,DisplayForm,ValidateInput,ShowError,VerifyPass,GenToken,FindUser,ReturnUser,UpdateLogin action;
    class IsValid,IsAuth decision;
`;

const rfqMmd = `flowchart TD
    classDef startEnd fill:#000,stroke:#000,stroke-width:2px,color:#fff,shape:circle;
    classDef action fill:#60A5FA,stroke:#2563EB,stroke-width:1px,color:#000;
    classDef decision fill:#60A5FA,stroke:#2563EB,stroke-width:1px,color:#000,shape:diamond;
    subgraph User [Client]
        direction TB
        Start((( ))) --> ClickPost[Click Post New Project button]
        FillForm[Fill and submit RFQ form]
        ViewSuccess[View success and project list]
        End((( )))
    end
    subgraph System [System]
        direction TB
        DisplayForm[Display create RFQ form]
        Validate[Verify form conformity]
        IsValid{Is Valid?}
        ShowError[Display error message]
        VerifyResult[Verify query result]
        IsSaved{Is Saved?}
        ShowSuccess[Display success message]
    end
    subgraph DBMS [DBMS]
        direction TB
        SaveDB[Execute insert RFQ query]
        ReturnResult[Return execution result]
    end
    ClickPost --> DisplayForm
    DisplayForm --> FillForm
    FillForm --> Validate
    Validate --> IsValid
    IsValid -->|No| ShowError
    ShowError --> FillForm
    IsValid -->|Yes| SaveDB
    SaveDB --> ReturnResult
    ReturnResult --> VerifyResult
    VerifyResult --> IsSaved
    IsSaved -->|No| ShowError
    IsSaved -->|Yes| ShowSuccess
    ShowSuccess --> ViewSuccess
    ViewSuccess --> End
    class Start,End startEnd;
    class ClickPost,FillForm,ViewSuccess,DisplayForm,Validate,ShowError,VerifyResult,ShowSuccess,SaveDB,ReturnResult action;
    class IsValid,IsSaved decision;
`;

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
        await downloadImage(getBase64(authMmd), 'C:\\\\Users\\\\GODLOVE\\\\Desktop\\\\Authentication_Activity_Diagram.png');
        console.log('Saved Authentication_Activity_Diagram.png to Desktop');
        await downloadImage(getBase64(rfqMmd), 'C:\\\\Users\\\\GODLOVE\\\\Desktop\\\\Create_RFQ_Activity_Diagram.png');
        console.log('Saved Create_RFQ_Activity_Diagram.png to Desktop');
    } catch (e) {
        console.error(e);
    }
};

run();
