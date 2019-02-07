export function transposeMatrix(inputMatrix: string[][]): string[][] {
  const transpose: string[][] = [];
  for (let y = 0; y < inputMatrix[0].length; y++) {
    transpose[y] = [];
    for (let x = 0; x < inputMatrix.length; x++) {
      transpose[y][x] = inputMatrix[x][y];
    }
  }
  return transpose;
}

export function createUniformArray(value: any, cols: number, rows: number) {
  const matrix: any[][] = [];
  for (let x = 0; x < cols; x++) {
    matrix[x] = [];
    for (let y = 0; y < rows; y++) {
      matrix[x][y] = value;
    }
  }
  return matrix;
}

export function convertStringTo2DArray(value: string, cols: number, rows: number) {
  const matrix: any[][] = createUniformArray("0", cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      matrix[x][y] = value[x * rows + y];
    }
  }
  return matrix;
}

export function flatten2DStringArray(array: string[][]) {
  let flatString = "";
  for (const row of array) {
    for (const cell of row) {
      flatString += cell;
    }
  }
  return flatString;
}

export class Keyboard {
  public value: string;
  public isDown: boolean;
  public isUp: boolean;
  public press: () => any;
  public release: () => any;

  constructor(value: string, downFunction: () => any, upFunction: () => any) {
    this.value = value;
    this.isDown = false;
    this.isUp = true;
    this.press = downFunction;
    this.release = upFunction;

    const downListener = this.downHandler.bind(this);
    const upListener = this.upHandler.bind(this);
    window.addEventListener("keydown", downListener, false);
    window.addEventListener("keyup", upListener, false);
  }

  private downHandler(event: any): void {
    if (event.key === this.value) {
      if (this.isUp && this.press) {
        this.press();
      }
      this.isDown = true;
      this.isUp = false;
      event.preventDefault();
    }
  }

  private upHandler(event: any): void {
    if (event.key === this.value) {
      if (this.isDown && this.release) {
        this.release();
      }
      this.isDown = false;
      this.isUp = true;
      event.preventDefault();
    }
  }
}

export function getAllUrlParams(url?: string) {
  // https://www.sitepoint.com/get-url-parameters-with-javascript/
  // get query string from url (optional) or window
  let queryString = url ? url.split("?")[1] : window.location.search.slice(1);

  // we'll store the parameters here
  const obj: any = {};

  // if query string exists
  if (queryString) {
    // stuff after # is not part of query string, so get rid of it
    queryString = queryString.split("#")[0];

    // split our query string into its component parts
    const arr = queryString.split("&");

    for (const arrArray of arr) {
      // separate the keys and the values
      const a = arrArray.split("=");

      // set parameter name and value (use 'true' if empty)
      const paramName = a[0];
      const paramValue = typeof a[1] === "undefined" ? true : a[1];

      // if the paramName ends with square brackets, e.g. colors[] or colors[2]
      if (paramName.match(/\[(\d+)?\]$/)) {
        // create key if it doesn't exist
        const key = paramName.replace(/\[(\d+)?\]/, "");
        if (!obj[key]) {
          obj[key] = [];
        }

        // if it's an indexed array e.g. colors[2]
        if (paramName.match(/\[\d+\]$/)) {
          // get the index value and add the entry at the appropriate position
          const index = /\[(\d+)\]/.exec(paramName)![1];
          obj[key][index] = paramValue;
        } else {
          // otherwise add the value to the end of the array
          obj[key].push(paramValue);
        }
      } else {
        // we're dealing with a string
        if (!obj[paramName]) {
          // if it doesn't exist, create property
          obj[paramName] = paramValue;
        } else if (obj[paramName] && typeof obj[paramName] === "string") {
          // if property does exist and it's a string, convert it to an array
          obj[paramName] = [obj[paramName]];
          obj[paramName].push(paramValue);
        } else {
          // otherwise add the property
          obj[paramName].push(paramValue);
        }
      }
    }
  }

  return obj;
}
