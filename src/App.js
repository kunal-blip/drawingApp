import React, { useLayoutEffect, useState } from "react";
import rough from "roughjs/bundled/rough.esm";

const generator = rough.generator();

// create line element using roughjs and return the element with its coordinates, at any random position on the canvas
function createElement(id, x1, y1, x2, y2, type) {
  const roughElement =
    type === "line"
      ? generator.line(x1, y1, x2, y2)
      : generator.rectangle(x1, y1, x2 - x1, y2 - y1);
  return { id, x1, y1, x2, y2, type, roughElement };
}
//  check if the point is near the element, if it's a line or a rectangle, check if it's near the start or end point of the line or the corners of the rectangle respectively
const nearPoint = (x, y, x1, y1, name) => {
  return Math.abs(x-x1) < 5 && Math.abs(y-y1) <5 ? name: null;
}
// determine if the point is near the element or inside the element, if it's a line or a rectangle respectively
const positionWithinElement = (x, y ,element) => {
  const {type, x1, x2, y1, y2 }  = element;
  if(type === "rectangle") {
    const topLeft = nearPoint( x, y, x1, y1, "tl");
    const topRight = nearPoint(x, y, x2, y1, "tr");
    const bottomLeft = nearPoint(x, y, x1, y2, "bl");
    const bottomRight = nearPoint(x, y, x2, y2, "br");
    const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" :null; // check if the point is inside the rectangle
    return topLeft || topRight || bottomLeft || bottomRight || inside;  // if the point is near the corner of the rectangle or inside the rectangle, return the position of the point relative to the rectangle
  }
  // if the element is a line, check if the point is near the start or end point of the line, if not check if the point is near
  //  the line by calculating the distance between the point and the line, if the distance is less than 1, return "inside"
  else{
    const a = { x: x1, y: y1 };
    const b = { x: x2, y: y2 };
    const c = { x, y };
    const offset = distance(a,b) - (distance(a, c) + distance(b, c));
    const start = nearPoint(x, y, x1, y1, "start");
    const end = nearPoint(x, y, x2, y2, "end");
    const inside =  Math.abs(offset) < 1 ? "inside" :null; // check if the point is near the line then return "inside" and if the point is near the start or end point of the line, return the position of the point relative to the line
    return start || end || inside; 
  }
}

// calculate the distance between two points for the line element, we can use the distance formula to calculate the distance between the point and 
// the line, if the distance is less than 1, we can consider the point to be near the line
const distance = (a,b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

// get the element at the position of the mouse click, we can loop through all the elements and check if the point is 
// near any of the elements, if it is, we can return the element and its position relative to the element
const getElementAtPosition = (x,y, elements) => {
  return elements
    .map(element => ({...element, position: positionWithinElement(x,y, element)}))
    .find(element => element.position !== null);
};

// adjust the coordinates of the element to ensure that x1, y1 is the top left corner and x2, y2 is the bottom right corner for the rectangle element, and for the line element, ensure that x1, y1 is the start point and x2, y2 is the end point
const adjustElementCoordinates = element => {
  const {type, x1, y1, x2, y2} = element;
  if (type === "rectangle") {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  } else {
    if (x1 <x2 || (x1 === x2 && y1 < y2)) {
      return {x1, y1, x2, y2};
    } else {
      return {x1: x2, y1: y2, x2: x1, y2: y1};
    }
  }
};

// set the cursor style based on the position of the mouse relative to the element, if the position is near the corner of the rectangle or the start or end point of the line, set the cursor to "nwse-resize", if the position is inside the element, set the cursor to "move", otherwise set the cursor to "default"
const cursorForPosition = position => {
  switch (position) {
    case "tl":
    case "br":
    case "start":
    case "end":
      return "nwse-resize";
    case "tr":
    case "bl":
      return "nwse-resize";
    default: 
      return "move";
  }
};

// calculate the new coordinates of the element based on the position of the mouse and the position of the element, if the position is near the corner of the rectangle or the start or 
// end point of the line, update the coordinates of the element based on the position of the mouse, if the position is inside the element, update the coordinates of the element based on the movement of the mouse
const resizedCoordinates = (clientX, clientY, position, coordinates) => {
  const {x1, y1, x2, y2} = coordinates;
    switch (position) {
      case "tl":
      case "start":
        return {x1: clientX, y1: clientY, x2, y2};
      case "tr":
        return {x1, y1: clientY, x2: clientX, y2};
      case "bl":
        return {x1: clientX, y1, x2, y2: clientY};
      case "br":
      case "end":
        return {x1, y1, x2: clientX, y2: clientY};
      default:
        return null
        // {x1, y1, x2, y2};

    }
}

const App = () => {
  // elements state to store the elements on the canvas, action state to store the current action 
  // (drawing, moving, resizing), tool state to store the current tool (line, rectangle, selection), selectedElement state to store the currently selected element
  const [elements, setElements] = useState([]);
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("line");
  const [selectedElement, setSelectedElement] = useState(null);

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");

    // clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // rough canvas instance
    const roughCanvas = rough.canvas(canvas);
    // draw all the elements on the canvas
    elements.forEach(({ roughElement }) => roughCanvas.draw(roughElement));
  }, [elements]);

  // update the element in the elements state, we can create a new element with the updated coordinates and replace the old element in the elements state with the new element
  const updateElement = (id, x1, y1, x2, y2, type) => {
    const updateElement = createElement(id, x1, y1, x2, y2, type);

      const elementsCopy = [...elements];
      elementsCopy[id] = updateElement;
      setElements(elementsCopy);
  }

  // handle mouse down event, if the tool is selection, check if the mouse is near any of the elements, if it is, set the selected element and the action to moving or resizing based on the position of the mouse relative to the element, if the tool is not selection, create a new element and set the action to drawing
  const handleMouseDown = (event) => {
    const { clientX, clientY } = event;
    if (tool === "selection") { // if the tool is selection, check if the mouse is near any of the elements, if it is, set the selected element and the action to moving or resizing based on the position of the mouse relative to the element
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element) {
        const offsetX = clientX - element.x1; // calculate the offset of the mouse click from the top left corner of the element, this will be used to move the element based on the movement of the mouse
        const offsetY = clientY - element.y1;
        setSelectedElement({...element, offsetX, offsetY});

        if(element.position === "inside"){ // if the position of the mouse is inside the element, set the action to moving, otherwise set the action to resizing
          setAction("moving");
        }
        else{ 
          setAction("resizing")
        }
      }
      
    } else {
      // if the tool is not selection, create a new element and set the action to drawing
      const id = elements.length;
    const element = createElement(id, clientX, clientY, clientX, clientY, tool);
    setElements((prevState) => [...prevState, element]); // add the new element to the elements state
    setSelectedElement(element) // set the selected element to the new element
    
    setAction("drawing");
    }
  };
// handle mouse move event, if the action is drawing, update the coordinates of the selected element based on the position of the mouse, if the action is moving, update the coordinates of the selected element based on the movement of the mouse, if the action is resizing, 
// update the coordinates of the selected element based on the position of the mouse and the position of the element
  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;

    if (tool=== 'selection') { // if the tool is selection, set the cursor style based on the position of the mouse relative to the element, if the position is near the corner of the rectangle or the start or end point of the line, set the cursor to "nwse-resize", if the position is inside the element, set the cursor to "move", otherwise set the cursor to "default"
      const element = getElementAtPosition(clientX, clientY, elements)
      // if the mouse is near any of the elements, set the cursor style based on the position of the mouse relative to the element, if the position is near the corner of the rectangle or the start or end point of the line, set the cursor to "nwse-resize", if the position is inside the element, set the cursor to "move", otherwise set the cursor to "default"
      event.target.style.cursor = element
      ? cursorForPosition(element.position) 
      : "default"; 
    }
    // if the action is drawing, update the coordinates of the selected element based on the position of the mouse, if the action is moving, update the coordinates of the selected element based on the movement of the mouse, if the action is resizing, update the coordinates of the selected element based on the position of the mouse and the position of the element
    if (action === "drawing") {
      const index = elements.length - 1;
      const { x1, y1 } = elements[index];
      updateElement(index, x1, y1, clientX, clientY, tool);
// if the action is drawing, update the coordinates of the selected element based on the position of the mouse, we can use the updateElement function to update the coordinates of the selected element in the elements state
    } else if (action === "moving") {
      const { id,  x1, x2, y1, y2, offsetX, offsetY } = selectedElement;
      const width = x2- x1;
      const height = y2 - y1;
      const newX1 = clientX - offsetX;
      const newY1 = clientY - offsetY;
      updateElement(id, newX1, newY1, newX1+ width, newY1+ height, selectedElement.type);
    }

    // if the action is resizing, update the coordinates of the selected element based on the position of the mouse and the position of the element, we can use the resizedCoordinates function to calculate the new coordinates of the selected element based on the position of the mouse and the position of the element, and then use the updateElement function to update the coordinates of the selected element in the elements state
    else if (action === "resizing") {
      const { id, type, position, ...coordinates } = selectedElement;
      const {x1, y1, x2, y2} = resizedCoordinates(clientX, clientY, position, coordinates)
      updateElement(id, x1, y1, x2, y2, type)
    }
  };
  // handle mouse up event, if the action is drawing or resizing, update the coordinates of the selected element based on the position of the mouse and the position of the element, we can use the adjustElementCoordinates function to adjust the coordinates of the selected element to ensure that x1, y1 is the top left corner and x2, y2 is the bottom right corner for the rectangle element, and for the line element, ensure that x1, y1 is the start point and x2, y2 is the end point, and then use the updateElement function to update the coordinates of the selected element in the elements state
  const handleMouseUp = () => {
    const index = selectedElement.id;
    const { id, type } = elements[index];    
    if (action === "drawing" || action === "resizing") {
      const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index]);
      updateElement(id, x1, y1, x2, y2, type);
    }
    setAction("none");
    setSelectedElement(null);
  };

  return (
    <div>
      <div style={{ position: "fixed" }}>
        <input
          type="radio"
          id="selection"
          checked={tool === "selection"}
          onChange={() => setTool("selection")}
        />
        <label htmlFor="selection">selection</label>
        <input
          type="radio"
          id="line"
          checked={tool === "line"}
          onChange={() => setTool("line")}
        />
        <label htmlFor="line">line</label>

        <input
          type="radio"
          id="rectangle"
          checked={tool === "rectangle"}
          onChange={() => setTool("rectangle")}
        />
        <label htmlFor="rectangle">rectangle</label>
      </div>

      <canvas
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        Canvas
      </canvas>
    </div>
  );
};

export default App;
