function processLoad()
{
    // Always fill in options
    fillInCannedQueries();
    // Process url bar for query
    sendQueryInURLBar();
}

// Pull CANNED QUERIES from a static definition
function fillInCannedQueries()
{
    var select = document.getElementById("query_choice");
    for (var i=0; i<CANNEDQUERIES.length; i++)
    {
        var option = document.createElement("option");
        option.setAttribute("value", "q" + i.toString());
        option.setAttribute("value1", CANNEDQUERIES[i][0]);
        option.appendChild(document.createTextNode(CANNEDQUERIES[i][1]));
        select.appendChild(option);
    }
}
 
// From URL bar: it is the master. Form fills on page just set this
function sendQueryInURLBar()
{
    if (!location.search)
        return;
    var args = new Object();
    var srch = location.search.substring(1);
    var pairs = srch.split("&");
    var query = "";
    var output = "";
    for(var i=0; i < pairs.length; i++)
    {
        var pos = pairs[i].indexOf("=");
        if (pos == -1)
            continue;
        var argname = pairs[i].substring(0, pos);
        var value = pairs[i].substring(pos+1);
        value = decodeURIComponent(value);
        if (argname == "fmql")
            query = value;
        else if (argname == "output")
            output = value;
        else
        {
            location.search = "";
            return;
        }
    }
    if (!query)
    {
         location.search = "";
         return;
    }
    if (!output)
         output = "JSON";

    boxQuery(query, output);

    var xhr = getXMLHttpRequest();
    xhr.onreadystatechange = function()
    { 
         if(xhr.readyState == 4)
         {
              if(xhr.status == 200) 
              {
                  if (output == "JSON")
                      html("results", "<pre>" + makeJSONPretty(xhr.responseText) + "</pre>"); 
                  else
                      html("results", makeHTMLFromJSON(xhr.responseText, query));
              }
              else 
                  html("results", "<pre>" + xhr.status + "</pre>");
         }
    }; 

    EPURL = "http://" + location.host + "/fmqlEP";
    queryURL = EPURL + "?fmql=" + encodeURIComponent(query);
    xhr.open('GET', queryURL,  true); 
    xhr.send(null);   
}

/*
 * Support user choosing a canned query or filling in a query 
 * in the query box and hitting send and updating the query
 * box from the location bar.
 */
function boxQuery(query, output)
{
    document.getElementById('query').value = query;
    if (!output)
        return; // leave at selected index
    if (output == "JSON")
        document.getElementById('output').selectedIndex = 1;
    else
        document.getElementById("output").selectedIndex = 0; // HTML
}

function handleSendQuery()
{
    var query = document.getElementById("query").value;
    if (!query)
        return;
    var outputIndex = document.getElementById("output").selectedIndex;
    var output =  document.getElementById("output")[outputIndex].text;
    var queryArgs = "fmql=" + encodeURIComponent(query);
    if (output != "JSON")
        queryArgs += "&output=" + output;
    location.search = queryArgs;
}

function handleSendAppointmentTypeQuery()
{
//    var query = document.getElementById("query").value;
    var query = "SELECT 409_1 LIMIT 10";
    if (!query)
        return;
    var outputIndex = document.getElementById("output").selectedIndex;
    var output =  document.getElementById("output")[outputIndex].text;
    var queryArgs = "fmql=" + encodeURIComponent(query);
    if (output != "JSON")
        queryArgs += "&output=" + output;
    location.search = queryArgs;
}
/*
 * JSON Output: make it "pretty"
 *
 * TBD: MUMPS side pretty up
 */
function makeJSONPretty(jsonReply)
{
    if (typeof JSON == 'undefined')
        return jsonReply; // IE 7
    /* Parse it and then set indent to 1 */
    return JSON.stringify(JSON.parse(jsonReply), null, 1);
}

/*
 * HTML Output - client side from JSON. 
 *
 * Calls into shared library with Rambler. See URLs to be query form
 */
SELECTLIMIT = "100";
function makeHTMLFromJSON(jsonReply, query)
{
    var json = toJSON(jsonReply);
    if ("error" in json)
        return ("<pre>" + jsonReply + "</pre>");
    if (query.match(/SELECT TYPES/) || query.match(/DESCRIBE TYPE/) || query.match(/SELECTALLREFERRERSTOTYPE/))
        return "<p>Cannot Display HTML for Schema Queries. Select JSON.</p>";
    if (query.match(/^SELECT /))
        return selectResultToHTML(json, false, "/query");
    if (query.match(/^DESCRIBE /))
        return describeResultToHTML(json, false, "/query");
    if (query.match(/^COUNT REFS/))
        // must set limit for reference queries: ie/ all vitals to patient 9
        return countRefsResultToHTML(json, false, "/query", SELECTLIMIT)
    if (query.match(/^COUNT/))
        return "<p>" + json["fmqlCount"] + "</p>";
    // May be DESCRIBE TYPE etc ie/ the Schema Queries. Only do JSON for now.
    return "<p>Cannot Display HTML for this Response Type. Select JSON</p>";
}

function makeAppointmentType(jsonReply) {
    var json = toJSON(jsonReply);

    var resultDiv = $("#resultDivContainer");

    $.ajax({
        url: "http://localhost:3000/test1",
        type: "POST",
        data: json,
        dataType: "json",
        success: function (result) {
            switch (result) {
                case true:
                    alert("case true, success");
                    processResponse(result);
                    break;
                default:
                    alert("case default, success");
                    resultDiv.html(result);
            }
        },
        error: function (xhr, ajaxOptions, thrownError) {
            alert("error happened")
            alert(xhr.status);
            alert(thrownError);
        }
    });
}