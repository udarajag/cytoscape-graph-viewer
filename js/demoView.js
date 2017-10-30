var page = 'dem';
function initialize() {
    //searchByQuery("match (n1:DataRecord)-[r1:hasVariable]->(n2), (n2)-[r2:instanceOf]->(n3) return r1,r2,n1,n2,n3 limit 2500");
    searchByQuery("match (n1)-[r1:hasVariable|instanceOf|hasValue]->(n2) where n2:DemConceptInstance or n2:DemConcept or n2:DemVal return n1,n2,r1 limit 2500");
}