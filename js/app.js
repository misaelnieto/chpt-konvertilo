/*
    prettify_xml was taken from stackoverflow. MIT license?
    https://stackoverflow.com/questions/376373/pretty-printing-xml-with-javascript/
*/
var prettify_xml = function(ugly_xml)
{
    var xmlDoc = new DOMParser().parseFromString(ugly_xml, 'application/xml');
    var xsltDoc = new DOMParser().parseFromString([
      // describes how we want to modify the XML - indent everything
        '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:strip-space elements="*"/>',
        '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
        '    <xsl:value-of select="normalize-space(.)"/>',
        '  </xsl:template>',
        '  <xsl:template match="node()|@*">',
        '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
        '  </xsl:template>',
        '  <xsl:output indent="yes"/>',
        '</xsl:stylesheet>',
    ].join('\n'), 'application/xml');

    var xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDoc);
    var resultDoc = xsltProcessor.transformToDocument(xmlDoc);
    var resultXml = new XMLSerializer().serializeToString(resultDoc);
    return resultXml;
};

var rgx1 = /^CHAPTER(\d+)\s?=\s*(\d{2}):(\d{2}):(\d{2}.\d+)$/i;
var rgx2 = /^CHAPTER(\d+)NAME\s?=\s*(.*)$/i;


function xmlConvert() {
    var src = document.getElementById("chpt");
    var dest = document.getElementById("result");
    var lines = src.value.split('\n');
    var xmlDoc = document.implementation.createDocument(null, "Chapters");
    var xmlChapters = xmlDoc.getElementsByTagName("Chapters")[0];
    var ee = xmlChapters.appendChild(xmlDoc.createElement("EditionEntry"));
    var seed = new Date().getTime();

    // TODO: generate uuid instead of 1233456
    ee.appendChild(xmlDoc.createElement("EditionUID")).append((seed - 1).toString());

    for (var l = 0; l < lines.length; l++) {
        if (rgx1.test(lines[l])) {
            let z = rgx1.exec(lines[l]);
            let ch = z[1], hh=z[2], mm=z[3], ss=z[4];
            let ca = ee.appendChild(xmlDoc.createElement("ChapterAtom"));
            let title = rgx2.exec(lines[l+1])[2];
            let cd = xmlDoc.createElement("ChapterDisplay");
            ca.appendChild(xmlDoc.createElement("ChapterTimeStart")).append(`${hh}:${mm}:${ss}`);
            ca.appendChild(cd);
            cd.appendChild(xmlDoc.createElement("ChapterString")).append(title);
            cd.appendChild(xmlDoc.createElement("ChapterLanguage")).append("spa");
            cd.appendChild(xmlDoc.createElement("ChapterCountry")).append("mx");
            ca.appendChild(xmlDoc.createElement("ChapterUID")).append(seed+l);
        }
    }
    var header = '<?xml version="1.0"?>\n<!-- <!DOCTYPE Chapters SYSTEM "matroskachapters.dtd"> -->\n';
    var content = new XMLSerializer().serializeToString(xmlDoc);
    dest.textContent = header + prettify_xml(content);
}

function audacityConvert() {
    var src = document.getElementById("chpt");
    var dest = document.getElementById("result");
    var lines = src.value.split('\n');

    dest.textContent = '';
    for (var l = 0; l < lines.length; l++) {
        if (rgx1.test(lines[l])) {
            let z = rgx1.exec(lines[l]);
            let hh=parseFloat(z[2]), mm=parseFloat(z[3]), ss=parseFloat(z[4]);
            let title = rgx2.exec(lines[l+1])[2];
            let t = (3600 * hh + 60 * mm + ss).toFixed(6);
            dest.textContent += `${t}\t${t}\t${title}\n`;
        }
    }
}


function message(msg_type, msg) {
    $("#messages").attr("class", `callout ${msg_type}`).text(msg);
    $("#messages").fadeIn(250);
    $("#messages").fadeOut(2500);
}


$(document).ready(function(){
    $(document).foundation();

    $("#chpt").on("input", function(evt){
        if (evt.target.textLength > 0) {
            $(".action.button, #copy, #download").prop('disabled', false);
        } else {
            $(".action.button, #copy, #download").prop('disabled', true);
        }
    });

    $("#toXML").on("click", function(evt){
        try {
            xmlConvert();
            $(".action.button, #copy, #download").prop('disabled', false);
            message("success", "Conversion OK");
        }
        catch (e) {
            message("alert", "Something went wrong. Could not convert to XML.");
            console.log(e); // pass exception object to error handler
        }
    });

    $("#toAudacity").on("click", function(evt){
        try {
            audacityConvert();
            $(".action.button, #copy, #download").prop('disabled', false);
            message("success", "Conversion OK");
        }
        catch (e) {
            message("alert", "Something went wrong. Could not convert to Audacity format.");
            console.log(e); // pass exception object to error handler
        }
    });

    $("#copy").on('click', function() {
        var mkvXml = document.getElementById("result").select();
        if (document.execCommand("copy")) {
            console.log("Yeaah");
            message("success", "Copied to clipboard");
        } else {
            message("alert", "Your browser does not support copying to clipboard, you will have to do it manually.\n :(");
        }
    });

    $("#download").on("click", function (evt) {
        // Is there a file on the input element?
        var fname = "capitulo.xml";

        if ($("#fileopen").length >0){
            fname = $("#fileopen")[0].files[0].name.toLowerCase().replace(".chpt", ".xml");
        }

        // Create file with results:
        var a = document.createElement("a");
        a.download = fname;
        a.href = "data:application/xml," + encodeURIComponent(document.getElementById("result").textContent);
        a.target="_blank";
        a.click();
        delete a;
    });

    $("#open").on("click", function (params) {
        $("#fileopen").click();
    })

    $("#fileopen").change(function () {
        var f = this.files[0];
        var reader = new FileReader();
        reader.readAsText(f, "UTF-8");
        reader.onload = function (evt) {
            $("#chpt").text(evt.target.result);
            $(".action.button").prop('disabled', false);
            message("success", "Archivo " + f.name);
        }
        reader.onerror = function (evt) {
            $("#chpt").innerHTML = "error reading file";
            message("alert", "Can't open the file. You will have to open it manually, copy the text and paste it.\n :(");
        }
    })
});
