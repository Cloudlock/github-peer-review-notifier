var REVIEW_REQUESTS_URL = "https://github.com/pulls/review-requested";
var LOGIN_URL = "https://github.com/login?return_to=%2Fpulls%2Freview-requested";
var OPEN_REVIEW_REQUEST_CSS_SELECTOR = "body.logged-in.env-production.page-responsive:nth-child(2) div.application-main:nth-child(5) div.page-content.position-relative.container-lg.p-responsive div.Box.Box--responsive.hx_Box--firstRowRounded0 div.Box-header.d-flex.flex-justify-between div.table-list-filters.flex-auto.d-none.d-md-block.no-wrap div.table-list-header-toggle.states.flex-auto.pl-0 > a.btn-link.selected:nth-child(1)";
var polling_interval_seconds = 20;

function goToUrl(){
    chrome.storage.sync.get(['request_count', 'last_known_status'], function(stored_data){
        console.log("stored_data : ", stored_data);
        var redirect_url = REVIEW_REQUESTS_URL;
        if(stored_data.last_known_status == 404){
            redirect_url = LOGIN_URL;
        }

        chrome.tabs.create({url: redirect_url}, function(tab) {
            console.log('Tab Created');
        });
    });
}


// UUID v4
function generateUuid()
{
    var uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var randVal = Math.random() * 16 | 0;
        var val = c == 'x' ? randVal : (randVal & 0x3 | 0x8);
        return val.toString(16);
    });
    return uuid;
}


function sendNotification(message){
    var title = "Github Peer Review Notifier";
    var notifOptions = {
        type: "basic",
        iconUrl: "icon48.png",
        title: title,
        message: message
    };
    chrome.notifications.create(generateUuid(), notifOptions);
}



function getReviewRequestCount(){
    var xhr = new XMLHttpRequest();
    xhr.open("GET", REVIEW_REQUESTS_URL, true);
    xhr.setRequestHeader("Access-Control-Allow-Origin", "*");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if(xhr.status != 200) {
            console.log("Status: " + xhr.status);
            // Status: 404 = Not logged in.
            // Status: 0 = Internet Disconnected
            if(xhr.status == 404){
                // Not logged in.
                setNotLoggedInBadge();
                chrome.storage.sync.set({
                    'last_known_status': xhr.status                            
                });
            }
          }
          else if(xhr.status == 200) {
            var result = xhr.responseText;
            //console.log(result);

            var doc = new DOMParser().parseFromString(result, "text/html");
            var element = doc.querySelector(OPEN_REVIEW_REQUEST_CSS_SELECTOR);
            var element_text = element.text;
            console.log(element_text);
            var current_request_count = parseInt(element_text);
            
            chrome.storage.sync.get(['request_count', 'last_known_status'], function(stored_data){
                console.log("stored_data : ", stored_data);
                var request_count = stored_data.request_count;
                if(request_count){
                    if(current_request_count > request_count){
                        sendNotification("You have got new code review request.");
                    }
                    else{

                    }
                }
                else if(current_request_count > 0){
                    sendNotification("You have pending code review requests.");
                } 

                updateBadgeCount(current_request_count.toString());
                chrome.storage.sync.set({
                    'request_count': current_request_count,
                    'last_known_status': xhr.status                            
                });
            });
            
          }
        }
    };
    xhr.send();
}

function updateBadgeCount(open_request_count){
    console.log("updateBadgeCount triggered!");
    if(open_request_count == '0'){
        open_request_count = '';
    }
    chrome.browserAction.setBadgeBackgroundColor({color:[255, 44, 51, 255]});
    chrome.browserAction.setBadgeText({text: open_request_count});
}

function setNotLoggedInBadge(){
    console.log("updateBadgeCount triggered!");
    chrome.browserAction.setBadgeBackgroundColor({color:[255, 153, 51, 255]});
    chrome.browserAction.setBadgeText({text: '!'});
}

function scheduleJobs(){
    requestTimerId = window.setInterval(getReviewRequestCount, polling_interval_seconds*1000);
}


// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(goToUrl);


getReviewRequestCount();
scheduleJobs();

