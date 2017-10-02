function search() {
    var statementx = $('#freeTS').val();
    if (statementx !== 'undefined' && statementx !== '') {
        var query = "MATCH ((x )-[r]-(y)) WHERE x.name =~ '(?i).*" + statementx + ".*' or y.name =~ '(?i).*" + statementx + ".*' RETURN x,r,y";

        searchByQuery(query);
    } else {
        alert("Please enter search text");
    }

}