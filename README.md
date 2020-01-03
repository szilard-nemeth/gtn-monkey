# GTN Monkey

### Prerequisites
Quanta links of TEST_LOGS and DIAG_BUNDLES are 
hosted on ```cloudera-build-us-west-1.vpc.cloudera.com/s3``` 
or any other similar S3 buckets.
GTN monkey need to make Fetch requests to S3 in order to check if test resources are still available.
As GTN monkey is running as a userscript of Jira, the domain (Origin) of the requests is https://jira.cloudera.com.
Nowadays, most browsers are implement CORS policy. In a nutshell, GTN monkey is not able to initiate cross-domain requests.
Fortunately, we have CORS-anywhere (https://github.com/Rob--W/cors-anywhere) 
which overcomes this problem by proxying the request and placing the appropriate CORS headers into the response.

As a consequence of all the above, to be able to use the Quanta link checker feature of GTN monkey, 
you need to run a self-hosted CORS-anywhere server.

#### Steps of running self-hosted CORS-anywhere server
1. You need to install nodejs first to run the server: https://nodejs.org/en/download/package-manager/
2. Additionally, you also need to install the following dependencies to be able to run CORS-anywhere.
```
npm install http-proxy
npm install proxy-from-env
```
3. Clone the project by running ```git clone https://github.com/Rob--W/cors-anywhere.git```
4. Set environment variables to the server:
```
export PORT=8081
export CORSANYWHERE_WHITELIST=https://jira.cloudera.com,http://jira.cloudera.com
```
5. And finally, run the server: ```node server.js```

#### Validate CORS-anywhere setup
Check if this request gives HTTP 200:
```curl -I --location --request HEAD \
'localhost:8081/http://cloudera-build-us-west-1.vpc.cloudera.com/s3/quanta/1400642/QUASAR_ZIP_FOLDER/QUASAR_TEST_LOGS.zip' \
--header 'Origin: https://jira.cloudera.com'
```
Note: If response code is HTTP 404, it can be because the link to QUASAR_TEST_LOGS 
is expired. In this case, find a valid diagnostic bundle / test logs link from 
any systest failure Jira and replace the request URL with: 
``"localhost:8081/<Quanta-link-goes-here>"``


Further reading:

https://medium.com/netscape/hacking-it-out-when-cors-wont-let-you-be-great-35f6206cc646

https://github.com/Rob--W/cors-anywhere


### Load GTN monkey scripts
1. To load GTN monkey scripts and you are using Google Chrome, 
you need to install Tampermonkey extension first: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en

2. Create a Tampermonkey script and paste the contents of this file into it: https://github.com/szilard-nemeth/gtn-monkey/blob/master/tampermonkey-gtnmonkey.js
3. Save the script and verify if the userscript is loaded properly. Please also check the console for any errors.


### Serve GTN monkey scripts with live-server
1. The simplest way is to serve the files by installing live-server: https://github.com/tapio/live-server
2. Clone GTN monkey's source: ``git clone https://github.com/szilard-nemeth/gtn-monkey.git``
3. cd into the cloned folder and run ``live-server``
4. Verify if ``localhost:8080`` loads properly and you should see all the files server for GTN monkey

### Serve GTN monkey scripts with Tampermonkey - Standalone mode
!!This is under development!!

Happy GTN link hunting!
