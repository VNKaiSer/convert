import { PCB_REVERSE_NAMESPACE_MAP, REVERSE_NAMESPACE_MAP } from "./xml-json-constants";

export const detectType = (text: string): "json" | "xml" | "text" => {
  const trimmed = text.trim()
  if (!trimmed) return "text"

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed)
      return "json"
    } catch (e) {
      // Not JSON
    }
  }

  if (trimmed.startsWith("<")) {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(trimmed, "application/xml")
      if (xmlDoc.getElementsByTagName("parsererror").length === 0) {
        return "xml"
      }
    } catch (e) {
      // Not XML
    }
  }

  return "text"
}

export const isB11TJson = (text: string) => {
  try {
    if (detectType(text) !== "json") return false
    const obj = JSON.parse(text)
    return isB11TShape(obj)
  } catch {
    return false
  }
}

export function isB11TShape(obj: unknown): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false
  const data = (obj as Record<string, unknown>).Data
  if (!data || typeof data !== "object" || Array.isArray(data)) return false
  return "MASOPHIEU" in data && "BC100" in data && "BC200" in data
}

export function findNestedB11TInfo(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object") return null

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findNestedB11TInfo(item)
      if (found) return found
    }
    return null
  }

  const record = obj as Record<string, unknown>
  const candidate = record.b11TInfo
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const b11t = candidate as Record<string, unknown>
    if (isB11TShape(b11t)) return b11t
  }

  for (const value of Object.values(record)) {
    const found = findNestedB11TInfo(value)
    if (found) return found
  }

  return null
}

export function preprocessPcbPasteJson(obj: unknown): unknown {
  const source = Array.isArray(obj) ? obj[0] : obj
  if (!source || typeof source !== "object" || Array.isArray(source)) return obj

  const item = source as Record<string, unknown>
  const isPcbPaste = "RI_Req_Output" in item || "customerId" in item

  if (!isPcbPaste) {
    if (
      item.MGResponse &&
      typeof item.MGResponse === "object" &&
      !Array.isArray(item.MGResponse)
    ) {
      return Array.isArray(obj) ? { MGResponse: item.MGResponse } : obj
    }
    return obj
  }

  if (
    item.MGResponse &&
    typeof item.MGResponse === "object" &&
    !Array.isArray(item.MGResponse)
  ) {
    return { MGResponse: item.MGResponse }
  }

  const { customerId: _customerId, ...rest } = item
  return { MGResponse: rest }
}

export function preprocessCicPasteJson(obj: unknown): unknown {
  if (isB11TShape(obj)) return obj

  const b11t = findNestedB11TInfo(obj)
  if (b11t) return b11t

  return obj
}

export function preprocessConverterJsonInput(
  obj: unknown,
  conversionType: "CIC" | "PCB"
): unknown {
  return conversionType === "PCB"
    ? preprocessPcbPasteJson(obj)
    : preprocessCicPasteJson(obj)
}

export function hasPcbPasteStructure(obj: unknown): boolean {
  const check = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false
    if (Array.isArray(value)) return value.some(check)

    const record = value as Record<string, unknown>
    if (record.RI_Req_Output) return true
    if (record.MGResponse && typeof record.MGResponse === "object") {
      return check(record.MGResponse)
    }
    if (record.Body && typeof record.Body === "object") return check(record.Body)
    if ("customerId" in record && "RI_Req_Output" in record) return true
    return false
  }

  return check(obj)
}

export function hasCicPasteStructure(obj: unknown): boolean {
  const check = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false
    if (Array.isArray(value)) return value.some(check)

    const record = value as Record<string, unknown>
    if (record.PHTimKiemKH || record.PHVanTinChung) return true
    if (record.Envelope && typeof record.Envelope === "object") return check(record.Envelope)
    if (isB11TShape(value)) return true
    if (findNestedB11TInfo(value)) return true
    return false
  }

  return check(obj)
}

export const isB11TXml = (text: string) => {
  try {
    if (detectType(text) !== "xml") return false
    return /<[^>]*PHHoiTinB11T[^>]*>/.test(text)
  } catch {
    return false
  }
}

export const formatJson = (json: string): string => {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

export const removePrefix = (name: string): string => {
  const colonIndex = name.indexOf(":")
  return colonIndex !== -1 ? name.substring(colonIndex + 1) : name
}

export const xmlElementToJson = (element: Element, checkIsB11TXml: boolean = false): any => {
  if (checkIsB11TXml && removePrefix(element.tagName) === "Data") {
    const raw = element.textContent?.trim() || null
    try {
      return raw ? JSON.parse(raw) : null
    } catch {
      return raw
    }
  }
  const result: any = {}
  const children = Array.from(element.children)
  if (children.length === 0) {
    const textContent = element.textContent?.trim()
    if (!textContent) return null
    if (/^-?\d+$/.test(textContent)) {
      if (textContent.length > 1 && textContent[0] === '0') {
        return textContent
      } else if (textContent.length > 2 && textContent[0] === '-' && textContent[1] === '0') {
        return textContent
      } else {
        return Number(textContent)
      }
    }
    return textContent
  }
  const childGroups: { [key: string]: Element[] } = {}
  children.forEach((child) => {
    const tagName = removePrefix(child.tagName)
    if (!childGroups[tagName]) {
      childGroups[tagName] = []
    }
    childGroups[tagName].push(child)
  })
  Object.keys(childGroups).forEach((tagName) => {
    const elements = childGroups[tagName]
    if (elements.length === 1) {
      result[tagName] = xmlElementToJson(elements[0], checkIsB11TXml)
    } else {
      result[tagName] = elements.map((el) => xmlElementToJson(el, checkIsB11TXml))
    }
  })
  return result
}

export const normalizeCICKey = (key: string) => {
  if (key === "envelope") return "Envelope";
  if (key === "header") return "Header";
  if (key === "body") return "Body";
  return key;
};

export const normalizeCICKeysDeep = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(normalizeCICKeysDeep);
  } else if (obj && typeof obj === "object") {
    const newObj: any = {};
    Object.keys(obj).forEach((key) => {
      const newKey = normalizeCICKey(key);
      newObj[newKey] = normalizeCICKeysDeep(obj[key]);
    });
    return newObj;
  }
  return obj;
};

export function jsonToXmlElement(obj: any, tagName: string, doc: Document, conversionType: "CIC" | "PCB", path: string[] = [], checkIsB11TJson: boolean = false): Element {
  if (checkIsB11TJson && tagName.endsWith("Data")) {
    const element = doc.createElement(tagName)
    element.textContent = JSON.stringify(obj, null, 2)
    return element
  }
  const isCIC = conversionType === "CIC"
  const isInsideData = isCIC && path.includes("Data")
  const reverseMap = isCIC ? REVERSE_NAMESPACE_MAP : PCB_REVERSE_NAMESPACE_MAP
  const normalizedTagName = isCIC ? normalizeCICKey(tagName) : tagName;
  const prefix = isInsideData ? "" : (reverseMap[normalizedTagName as keyof typeof reverseMap] || "")
  const fullTagName = prefix ? `${prefix}:${normalizedTagName}` : normalizedTagName
  const element = doc.createElement(fullTagName)

  if (obj === null || obj === undefined) {
    return element
  }

  if (typeof obj === "string" || typeof obj === "number") {
    element.textContent = String(obj)
    return element
  }

  if (Array.isArray(obj)) {
    return element
  }

  if (typeof obj === "object") {
    Object.keys(obj).forEach((key) => {
      const value = obj[key]
      const normalizedKey = isCIC ? normalizeCICKey(key) : key;
      if (Array.isArray(value)) {
        value.forEach((item) => {
          const childElement = jsonToXmlElement(item, normalizedKey, doc, conversionType, [...path, normalizedTagName], checkIsB11TJson)
          element.appendChild(childElement)
        })
      } else {
        const childElement = jsonToXmlElement(value, normalizedKey, doc, conversionType, [...path, normalizedTagName], checkIsB11TJson)
        element.appendChild(childElement)
      }
    })
  }

  return element
}

export const formatXml = (xml: string): string => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "application/xml");
    if (xmlDoc.getElementsByTagName("parsererror").length) {
      return xml;
    }

    const indentString = "  ";

    const formatNode = (node: Node, level: number): string => {
      const indent = indentString.repeat(level);
      let result = "";

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const childNodes = Array.from(el.childNodes);
        const childElementNodes = childNodes.filter(n => n.nodeType === Node.ELEMENT_NODE);
        const textNodes = childNodes.filter(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
        const hasChildElements = childElementNodes.length > 0;
        const hasTextContent = textNodes.length > 0;
        const isMixedContent = hasChildElements && hasTextContent;

        result += `${indent}<${el.tagName}`;
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          result += ` ${attr.name}="${attr.value}"`;
        }

        if (!el.hasChildNodes()) {
          result += `></${el.tagName}>\n`;
        } else if (hasChildElements || isMixedContent) {
          result += ">\n";
          childNodes.forEach(child => {
            result += formatNode(child, level + 1);
          });
          result += `${indent}</${el.tagName}>\n`;
        } else {
          result += `>${el.textContent || ""}</${el.tagName}>\n`;
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          result += `${indent}${text}\n`;
        }
      } else if (node.nodeType === Node.COMMENT_NODE) {
        result += `${indent}<!--${node.textContent}-->\n`;
      } else {
        const serialized = new XMLSerializer().serializeToString(node);
        if (serialized.trim()) {
          result += `${indent}${serialized}\n`;
        }
      }

      return result;
    };

    let formattedXml = "";
    for (let i = 0; i < xmlDoc.childNodes.length; i++) {
      formattedXml += formatNode(xmlDoc.childNodes[i], 0);
    }

    return formattedXml.trim();
  } catch (e) {
    return xml;
  }
};
