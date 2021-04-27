var scene = null;
var maxDepth = 1;
var background_color = [190/255, 210/255, 215/255];
var ambientToggle = true;
var diffuseToggle = true;
var specularToggle = true;
var reflectionToggle = true;
var bias = 0.001;

class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }
}

class Intersection {
    constructor(distance, point) {
        this.distance = distance;
        this.point = point;
    }
}

class Hit {
    constructor(intersection, object) {
        this.intersection = intersection;
        this.object = object;
    }
}

/*
    Intersect objects
*/
function raySphereIntersection(ray, sphere) {
    var center = sphere.center;
    var radius = sphere.radius;

    var rayDirection = normalize(ray.direction);

    // Compute intersection

    var A = dot(rayDirection, rayDirection);
    var B = dot(rayDirection, sub(ray.origin, center)) * 2;
    var C = dot(sub(ray.origin, center), sub(ray.origin, center)) - (radius * radius);

    var Det = B*B - 4*A*C;
    if(Det >= 0){
        var t = (-B - Math.sqrt(Det)) / (2*A);
        if(t>0){
            var intersection = add(ray.origin, mult(ray.direction, t-bias));

            return new Intersection(t, intersection);
        }
    }

    return null;

    // If there is a intersection, return a new Intersection object with the distance and intersection point:
    // E.g., return new Intersection(t, point);

    // If no intersection, return null
}

function rayPlaneIntersection(ray, plane) {

    // Compute intersection
    var pnormal = normalize(plane.normal);
    var rayDirection = normalize(ray.direction);
    var dotproduct = dot(pnormal, rayDirection);
    if(Math.abs(dotproduct) < 0.0001){
        //console.log("no ray plane intersection");
        return null;
    }
    else{
        var t = dot(pnormal, sub(plane.center, ray.origin)) / dotproduct;
        //console.log("ray plane intersection");
        if(t >0){
            var intersection = add(ray.origin, mult(rayDirection, t-bias));
            
            return new Intersection(t, intersection);
        }
        
    }
    return null;

    // If there is a intersection, return a dictionary with the distance and intersection point:
    // E.g., return new Intersection(t, point);

    // If no intersection, return null

}

function intersectObjects(ray, depth) {

    var lowestDistance = Infinity;
    var closestObject = null;
    var closestIntersection = null;
    for(var i=0; i < scene.objects.length; i++){
        var object = scene.objects[i];
        var intersection;
        if(object.type == "plane"){
            //console.log("im plane");
            intersection = rayPlaneIntersection(ray, object);
        }
        else{
            intersection = raySphereIntersection(ray, object);
        }
        if(intersection != null){
            if(lowestDistance > intersection.distance){
                lowestDistance = intersection.distance;
                closestObject = object;
                closestIntersection = intersection;
            }
            else{
                // do nothing
            }
        }
    }

    if(closestObject == null){
        //console.log("this cant possibly happen");
        return null;
    }
    else{
        return new Hit(closestIntersection, closestObject);
    }
    // Loop through all objects, compute their intersection (based on object type and calling the previous two functions)
    // Return a new Hit object, with the closest intersection and closest object

    // If no hit, retur null

}

function sphereNormal(sphere, pos) {
    return normalize(sub(pos, sphere.center));
    // Return sphere normal
}

/*
    Shade surface
*/
function shade(ray, hit, depth) {

    var object = hit.object;
    var color = [0,0,0];
    
    var normal;
    
    if(object.type == "plane"){
        normal = normalize(object.normal);
    }
    else{
        normal = normalize(sphereNormal(object, hit.intersection.point));
    }
    // Compute object normal, based on object type
    // If sphere, use sphereNormal, if not then it's a plane, use object normal
    
    var totalLighting = 0;
    // Loop through all lights, computing diffuse and specular components *if not in shadow*
    var diffuse = 0;
    var specular = 0;
    
    for(var i =0; i < scene.lights.length; i++){
        if(isInShadow(hit, scene.lights[i])){
            // in shadow
        }
        else{
            var lightVector = normalize(sub(scene.lights[i].position, hit.intersection.point));
            var halfVector = normalize(add(mult(normalize(ray.direction), -1), lightVector));
            diffuse = diffuse + object.diffuseK * dot(lightVector, normal);
            specular = specular + object.specularK * Math.pow(dot(halfVector, normal), object.specularExponent);

        }   
    }

    if(ambientToggle){
        totalLighting = totalLighting + object.ambientK;
    }
    if(diffuseToggle){
        totalLighting = totalLighting + diffuse;
    }
    if(specularToggle){
        totalLighting = totalLighting + specular;
    }
    //console.log(totalLighting);
    color = mult(object.color, totalLighting)

    // Combine colors, taking into account object constants

    // Handle reflection, make sure to call trace incrementing depth

    //create new ray based on normal & ray & intersectin point(origin)

    var oppositeRay = normalize(mult(ray.direction, -1));

    var reflectionVector = sub(mult(normalize(normal), 2 * dot(oppositeRay, normalize(normal))), oppositeRay);

    var newRay = new Ray(hit.intersection.point, reflectionVector);

    var newColor = trace(newRay, depth +1);
    if(newColor != null && reflectionToggle){
        newColor = mult(newColor, object.reflectiveK);
        color = add(color, newColor);
    }
    
    //console.log(newColor);




    
    return color;
}


/*
    Trace ray
*/
function trace(ray, depth) {
    if(depth > maxDepth) return background_color;
    var hit = intersectObjects(ray, depth);
    if(hit != null) {
        var color = shade(ray, hit, depth);
        return color;
    }
    return null;
}

function isInShadow(hit, light) {

    // Check if there is an intersection between the hit.intersection.point point and the light
    // If so, return true
    // If not, return false

    var contact = hit.intersection.point;
    var lightDirection = normalize(sub(light.position, contact));

    var ray = new Ray(hit.intersection.point, lightDirection);

    var newHit = intersectObjects(ray, 0);
    //console.log("what??");
    if(newHit != null){
        //console.log("not null!");
        if(newHit.intersection.point != contact){
            //console.log("return true!");
            return true;
        }
    }
    return false;

}

/*
    Render loop
*/
function render(element) {
    if(scene == null)
        return;
    
    var width = element.clientWidth;
    var height = element.clientHeight;
    element.width = width;
    element.height = height;
    scene.camera.width = width;
    scene.camera.height = height;

    var ctx = element.getContext("2d");
    var data = ctx.getImageData(0, 0, width, height);

    var eye = normalize(sub(scene.camera.direction,scene.camera.position));
    var right = normalize(cross(eye, [0,1,0]));
    var up = normalize(cross(right, eye));
    var fov = ((scene.camera.fov / 2.0) * Math.PI / 180.0);

    var halfWidth = Math.tan(fov);
    var halfHeight = (scene.camera.height / scene.camera.width) * halfWidth;
    var pixelWidth = (halfWidth * 2) / (scene.camera.width - 1);
    var pixelHeight = (halfHeight * 2) / (scene.camera.height - 1);

    for(var x=0; x < width; x++) {
        for(var y=0; y < height; y++) {
            var vx = mult(right, x*pixelWidth - halfWidth);
            var vy = mult(up, y*pixelHeight - halfHeight);
            var direction = normalize(add(add(eye,vx),vy));
            var origin = scene.camera.position;

            var ray = new Ray(origin, direction);
            var color = trace(ray, 0);
            if(color != null) {
                var index = x * 4 + y * width * 4;
                data.data[index + 0] = color[0];
                data.data[index + 1] = color[1];
                data.data[index + 2] = color[2];
                data.data[index + 3] = 255;
            }
        }
    }
    console.log("done");
    ctx.putImageData(data, 0, 0);
}

/*
    Handlers
*/
window.handleFile = function(e) {
    var reader = new FileReader();
    reader.onload = function(evt) {
        var parsed = JSON.parse(evt.target.result);
        scene = parsed;
    }
    reader.readAsText(e.files[0]);
}

window.updateMaxDepth = function() {
    maxDepth = document.querySelector("#maxDepth").value;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleAmbient = function() {
    ambientToggle = document.querySelector("#ambient").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleDiffuse = function() {
    diffuseToggle = document.querySelector("#diffuse").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleSpecular = function() {
    specularToggle = document.querySelector("#specular").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleReflection = function() {
    reflectionToggle = document.querySelector("#reflection").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

/*
    Render scene
*/
window.renderScene = function(e) {
    var element = document.querySelector("#canvas");
    render(element);
}