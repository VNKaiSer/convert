export const NAMESPACE_MAP = {
    env: "http://schemas.xmlsoap.org/soap/envelope/",
    ns2: "http://www.endpoint.ws.h2h.cic.org.vn/cicqr",
  }
  
  export const REVERSE_NAMESPACE_MAP = {
    Envelope: "env",
    Header: "env",
    Body: "env",
    PHTimKiemKH: "ns2",
    TimKiemKHKQ: "ns2",
    TenKH: "ns2",
    DiaChi: "ns2",
    MaCIC: "ns2",
    MaKH: "ns2",
    LoaiKH: "ns2",
    MSThue: "ns2",
    SoCMT: "ns2",
    DKKD: "ns2",
    Data: "ns2",
    TTPhanHoi: "ns2",
    TrangThai: "ns2",
    Ma: "ns2",
    MoTa: "ns2",
    PHVanTinChung: "ns2",
  }
  
  export const PCB_NAMESPACE_MAP = {
    soap: "http://schemas.xmlsoap.org/soap/envelope/",
    xmlns: "urn:crif-messagegateway:2006-08-23",
    gateway: "urn:crif-messagegateway:2006-08-23",
  }
  
  export const PCB_REVERSE_NAMESPACE_MAP = {
    Envelope: "soap",
    Header: "soap",
    Body: "soap",
    MGResponse: "",
    RI_Req_Output: "",
    Subject: "",
    Inquired: "",
    Matched: "",
    Person: "",
    CreditHistory: "",
    InquiredOperation: "",
    GeneralData: "",
    Contract: "",
  }
  
  export const S37_GROUPS = [
    { group: "none", pattern: "" },
    { group: "0", pattern: "Khách hàng không có quan hệ tại TCTD, không có nợ cần chú ý và không có nợ xấu" },
    { group: "1", pattern: "Khách hàng , không có nợ cần chú ý và không có nợ xấu" },
    { group: "2", pattern: "Khách hàng , có nợ cần chú ý và không có nợ xấu" },
    { group: "3", pattern: "Khách hàng - Không có nợ nhóm 5" },
    { group: "4", pattern: "Khách hàng - Không có nợ nhóm 5" },
    { group: "5", pattern: "Khách hàng - Có nợ nhóm 5" },
  ]
  
  export const B11T_GROUPS = [
    { group: "none", pattern: "" },
    { group: "0", pattern: "GROUP 0" },
    { group: "1", pattern: "GROUP 1" },
    { group: "2", pattern: "GROUP 2" },
    { group: "3", pattern: "GROUP 3" },
    { group: "4", pattern: "GROUP 4" },
    { group: "5", pattern: "GROUP 5" },
    { group: "no_cic", pattern: "No CIC" },
  ]
  
  export const B11T_GROUP_DATA: Record<string, any> = {
    "0": {
      "BC200": {
        "BC210": "0",
        "BC220": "0",
        "BC230": "0",
        "BC240": "0",
        "BC250": "0",
        "BC260": "0",
        "BC270": "0"
      }
    },
    "1": {
      "BC200": {
        "BC210": "0",
        "BC220": "1",
        "BC230": "0",
        "BC240": "0",
        "BC250": "0",
        "BC260": "0",
        "BC270": "0"
      }
    },
    "2": {
      "BC200": {
        "BC210": "1",
        "BC220": "1",
        "BC230": "1",
        "BC240": "0",
        "BC250": "0",
        "BC260": "0",
        "BC270": "0"
      }
    },
    "3": {
      "BC200": {
        "BC210": "1",
        "BC220": "1",
        "BC230": "1",
        "BC240": "1",
        "BC250": "1",
        "BC260": "1",
        "BC270": "0"
      }
    },
    "4": {
      "BC200": {
        "BC210": "1",
        "BC220": "1",
        "BC230": "1",
        "BC240": "1",
        "BC250": "1",
        "BC260": "1",
        "BC270": "0"
      }
    },
    "5": {
      "BC200": {
        "BC210": "1",
        "BC220": "1",
        "BC230": "1",
        "BC240": "1",
        "BC250": "1",
        "BC260": "1",
        "BC270": "1"
      }
    },
    "no_cic": {
      "TL099": "OUT_99: Lỗi không xác định"
    }
  }
  