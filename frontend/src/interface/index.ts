import { clients } from "wailsjs/go/models";

export interface TableTabs {
    title: string;
    name: string;
    content: any[];
    total: number;
    pageSize: number;
    currentPage: number;
}

export interface QuakeTableTabs {
    title: string;
    name: string;
    content: any[];
    total: number;
    pageSize: number;
    currentPage: number;
    isBatch: boolean;
    ipList: string[];
}

export interface URLFingerMap {
    url: string;
    finger: string[];
}

export interface PortScanData {
    IP: string;
    Port: number;
    Server: string;
    Link: string;
    HttpTitle: string;
}

export interface Vulnerability {
    vulID: string;
    vulName: string;
    protocoltype: string;
    severity: string;
    vulURL: string;
    request: string;
    response: string;
    extInfo: string;
    reference: string;
    description: string;
}

export interface FingerprintTable {
    url: string;
    status: string;
    length: string;
    title: string;
    detect: string;
    existsWaf: boolean;
    waf: string;
    fingerprint: string[];
}

export interface Dir {
    Status: number;
    URL: string;
    Location: string;
    Length: number;
    Body: string;
    Recursion: number;
}

export interface DirScanOptions {
    Method: string;
    URLs: string[];
    Paths: string[];
    Workers: number;
    Timeout: number;
    BodyExclude: string;
    BodyLengthExcludeTimes: number;
    StatusCodeExclude: number[];
    Redirect: boolean;
    Interval: number;
    CustomHeader: string;
    Recursion: number;
}

export interface ProxyOptions {
    Enabled: boolean;
    Mode: string;
    Address: string;
    Port: number;
    Username: string;
    Password: string;
}

export interface FofaResult {
    Error?: boolean;
    Message?: string;
    Size?: number;
    Results?: Results[];
}

export interface Results {
    URL: string;
    Host: string;
    Title: string;
    IP: string;
    Port: string;
    Domain: string;
    Protocol: string;
    Region: string;
    ICP: string;
}

export interface LocalOpitons {
    Name: string;
    Children: Child[] | null;
}

export interface Child {
    Name: string;
    Type: string;
    Path: string;
    Target: string;
}

export interface File {
    Error?: boolean;
    Message?: string;
    Content?: string;
}

export interface HunterEntryTips {
    value: string;
    assetNum: number;
    tags: string[];
}

export interface RuleForm {
    name?: string;
    desc?: string;
}

export interface CompanyInfo {
    CompanyName?: string;
    Holding?: string;
    Investment?: string;
    RegStatus?: string;
    Domains?: string[];
}

export interface WechatInfo {
    CompanyName?: string;
    WechatName?: string;
    WechatNums?: string;
    Logo?: string;
    Qrcode?: string;
    Introduction?: string;
}

export interface QuakeResult {
    Code?: number; // 响应状态信息，正常是0
    Message?: string; // 提示信息
    Data?: QuakeData[];
    Total?: number;
    Credit?: number; // 剩余积分
}

export interface QuakeData {
    Components: string[];
    Port: number;
    Protocol: string; // 协议类型
    Host: string;
    Title: string;
    IcpName: string;
    IcpNumber: string;
    IP: string;
    Isp: string;
    Position: string;
}

export interface QuakeTipsResult {
    Code?: number;
    Message?: string;
    Data?: QuakeTipsData[];
}

export interface QuakeTipsData {
    Product_name: string;
    Vul_count: number;
    Vendor_name: string;
    Ip_count: number;
}


export interface DefaultKeyValue {
    text: string
    value: string
}

export interface Uncover {
    title: string;
    name: string;
    content: UncoverData[];
    total: number;
    pageSize: number;
    currentPage: number;
}

interface UncoverData {
    URL: string
    IP: string
    Domain: string
    Port: string
    Protocol: string
    Component: string
    Source: string
}

export interface LogInfo {
    Level: string
    Msg: string
}

export interface BruteResult {
    Host: string
    Port: string
    Protocol: string
    Username: string
    Password: string
}

export interface SubdomainOption {
    Mode: number
    Domains: string[]
    Subs: string[]
    ChaosApi: string
    ZoomeyeApi: string
    SecuritytrailsApi: string
    BevigilApi: string
    GithubApi: string
    Thread: number // 解析线程
    Timeout: number // 仅枚举模式启用时生效
    ResolveExcludeTimes: number // 解析过滤IP次数
    DnsServers: string[]
}

export interface SubdomainInfo {
    Domain: string
    Subdomain: string
    Ips: string[]
    IsCdn: boolean
    CdnName: string
    Source: string
}

export interface ISICResult {
    Query: string
    Status: boolean
    Total: number
    Items: string[]
    Link: string
}

export interface PocDetail {
    Name: string
    AssociatedFingerprint: string[]
}

export interface NulceiOptions {
    Mode: number
    Engine: string
    Interactsh: boolean
    CustomTags: string[] // 全漏洞扫描时，使用自定义标签
    Risk: string
    Proxy: clients.Proxy
}