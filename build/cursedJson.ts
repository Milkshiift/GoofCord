/*
    https://github.com/antonmedv/fast-json

    MIT License

    Copyright (c) 2018 Anton Medvedev

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

/**
 * Extract part of json by path.
 * Example: fastJSON('{...}', ['foo', 'bar'])
 *
 * @param {String} input JSON
 * @param {Array} path Path for extraction
 * @returns {*}
 * @throws SyntaxError
 */
export function extractJSON(input: string, path: Array<string>): string | undefined {
  let lookup = path[0]; // Holds key what we should find next

  let record = false; // Triggers setting of next variables.
  let start = 0,
      end = 0; // Holds found offsets in input.
  let stringStart = -1,
      stringEnd = -1; // Track start and end of string values
  let quoteType: string | null = null; // Track the type of quotes used for the current string (' or ")

  const stack: number[] = []; // Count brackets and ":" sign.
  const isKeys = 0,
      isArray = 1,
      isValue = 2;
  let level = 0; // Current depth level.
  let on = 1; // What level we are expecting right now.
  let pathIndex = 0; // Track the current index in the path array

  loop: for (let i = 0, len = input.length; i < len; i++) {
    const ch = input[i];
    switch (ch) {
      case "{": {
        stack.push(isKeys);
        level++;
        break;
      }

      case "}": {
        const t = stack.pop();
        if (t !== isValue && t !== isKeys) {
          throw new SyntaxError(
              `Unexpected token ${ch} in JSON at position ${i}`
          );
        }
        level--;
        if (record && level < on) {
          end = i - 1;
          break loop;
        }
        if (level < on) {
          // Reset if we didn't find a match within this object
          pathIndex = 0;
          on = 1;
          lookup = path[pathIndex];
        }
        break;
      }

      case "[": {
        stack.push(isArray);
        level++;
        break;
      }

      case "]": {
        if (stack.pop() !== isArray) {
          throw new SyntaxError(
              `Unexpected token ${ch} in JSON at position ${i}`
          );
        }
        level--;
        if (record && level < on) {
          end = i - 1;
          break loop;
        }
        if (level < on) {
          // Reset if we didn't find a match within this array
          pathIndex = 0;
          on = 1;
          lookup = path[pathIndex];
        }
        break;
      }

      case ":": {
        const t = stack[stack.length - 1];
        if (t === isKeys) {
          stack[stack.length - 1] = isValue;
        }
        if (record && level === on) {
          start = i + 1;
        }
        break;
      }

      case ",": {
        const t = stack[stack.length - 1];
        if (t === isValue) {
          stack[stack.length - 1] = isKeys;
        }
        if (record && level === on) {
          end = i - 1;
          break loop;
        }
        break;
      }

      case '"':
      case "'":
        if (!quoteType) {
          // Start of a string
          quoteType = ch;
          let j = i + 1;

          // Consume whole string till the closing quote of the same type
          for (; j < len; j++) {
            const char = input[j];
            if (char === quoteType && input[j - 1] !== "\\") {
              break; // Found the closing quote
            }
          }

          // Check if the current key is what we were looking for.
          const t = stack[stack.length - 1];
          if (
              t === isKeys &&
              level === on &&
              input.slice(i + 1, j) === lookup // Exclude quotes when comparing keys
          ) {
            pathIndex++;
            if (pathIndex < path.length) {
              lookup = path[pathIndex];
              on++;
            } else {
              record = true;
            }
          }

          if (t === isValue && record && level === on) {
            stringStart = i + 1; // Exclude the opening quote
            stringEnd = j; // Exclude the closing quote
          }

          i = j; // Continue from the end of the string.
          quoteType = null; // Reset quote type
        }
        break;

      default:
        // Handle unquoted keys
        if (
            stack[stack.length - 1] === isKeys &&
            level === on &&
            /[a-zA-Z0-9_$]/.test(ch)
        ) {
          let j = i;
          while (j < len && /[a-zA-Z0-9_$]/.test(input[j])) {
            j++;
          }
          const unquotedKey = input.slice(i, j);
          if (unquotedKey === lookup) {
            pathIndex++;
            if (pathIndex < path.length) {
              lookup = path[pathIndex];
              on++;
            } else {
              record = true;
            }
          }
          i = j - 1; // Adjust i to the last character of the unquoted key
        }
        break;
    }
  }

  if (stringStart !== -1 && stringEnd !== -1) {
    const extractedString = input.slice(stringStart, stringEnd);

    // Handle escape sequences
    const unescapedString = extractedString.replace(/\\(.)/g, (match, p1) => {
      switch (p1) {
        case "n":
          return "\n"; // Newline
        case "t":
          return "\t"; // Tab
        case "r":
          return "\r"; // Carriage return
        case "b":
          return "\b"; // Backspace
        case "f":
          return "\f"; // Form feed
        case "'":
          return "'"; // Single quote
        case '"':
          return '"'; // Double quote
        case "\\":
          return "\\"; // Backslash
        default:
          return p1; // Other escaped characters (e.g., \x41 for hex) - keep as is
      }
    });

    return unescapedString;
  } else if (start !== 0 && start <= end) {
    const part = input.slice(start, end + 1); // We found it.
    return part;
  } else if (level !== 0) {
    throw new SyntaxError(`JSON parse error`);
  }
}

/**
 * Extracts all keys at a specific level in a JSON string,
 *
 * @param {string} input The JSON string.
 * @param {number} targetLevel The target level to extract keys from.
 * @returns {string[]} An array of keys found at the target level.
 * @throws SyntaxError
 */
export function extractKeysAtLevel(input: string, targetLevel: number): string[] {
  const keys: string[] = [];
  const stack: number[] = [];
  const isKeys = 0, isArray = 1, isValue = 2;
  let level = 0;

  for (let i = 0, len = input.length; i < len; i++) {
    const ch = input[i];
    switch (ch) {
      case '{':
        stack.push(isKeys);
        level++;
        break;

      case '}':
        const t = stack.pop();
        if (t !== isValue && t !== isKeys) {
          throw new SyntaxError(`Unexpected token ${ch} in JSON at position ${i}`);
        }
        level--;
        break;

      case '[':
        stack.push(isArray);
        level++;
        break;

      case ']':
        if (stack.pop() !== isArray) {
          throw new SyntaxError(`Unexpected token ${ch} in JSON at position ${i}`);
        }
        level--;
        break;

      case ':':
        if (stack[stack.length - 1] === isKeys) {
          stack[stack.length - 1] = isValue;
        }
        break;

      case ',':
        if (stack[stack.length - 1] === isValue) {
          stack[stack.length - 1] = isKeys;
        }
        break;

      case '"':
        let j = ++i; // next char after "

        // Consume whole string till next " symbol.
        for (; j < len; j++) {
          const ch = input[j];

          if (ch === '"' && input[j - 1] !== '\\') { // Make sure " doesn't escaped.
            break;
          }
        }

        // If we're at the target level and in a key position, record the key.
        if (level === targetLevel && stack[stack.length - 1] === isKeys) {
          keys.push(input.slice(i, j));
        }

        i = j; // Continue from end of string.
        break;

      default:
        // Handle unquoted keys
        if (level === targetLevel && stack[stack.length - 1] === isKeys && /[a-zA-Z0-9_$]/.test(ch)) {
          let j = i;
          while (j < len && /[a-zA-Z0-9_$]/.test(input[j])) {
            j++;
          }
          keys.push(input.slice(i, j));
          i = j - 1; // Adjust i to the last character of the unquoted key
        }
        break;
    }
  }

  if (level !== 0) {
    throw new SyntaxError(`JSON parse error`);
  }

  return keys;
}