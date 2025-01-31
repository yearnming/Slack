<script lang="ts" setup>
import { reactive, onMounted, ref, h } from 'vue'
import { VideoPause, QuestionFilled, Plus, ZoomIn, CopyDocument, ChromeFilled, RefreshRight, Menu, Promotion, Filter, View, DeleteFilled, UploadFilled } from '@element-plus/icons-vue';
import {
    InitRule,
    FofaSearch,
    FingerprintList,
    NewWebScanner,
    GetFingerPocMap,
    Callgologger,
    Kill,
    LoadNulceiResult,
} from 'wailsjs/go/main/App'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import { formatURL2, TestProxy, Copy, CopyALL, transformArrayFields, TestNuclei } from '@/util'
import { ExportWebScanToXlsx } from '@/export'
import global from "@/global"
import { BrowserOpenURL, EventsOn, EventsOff } from 'wailsjs/runtime/runtime';
import { Vulnerability, FingerprintTable, FofaResult, NulceiOptions, File } from '@/interface';
import usePagination from '@/usePagination';
import exportIcon from '@/assets/icon/doucment-export.svg'
import historyIcon from '@/assets/icon/history.svg'
import { LinkDirsearch, LinkHunter } from '@/linkage';
import ContextMenu from '@imengyu/vue3-context-menu'
import { defaultIconSize } from '@/stores/style';
import { FileDialog, List, ReadFile, RemoveFile } from 'wailsjs/go/main/File';
import * as XLSX from "xlsx";

// 初始化时调用
onMounted(async () => {
    ListNucleiScanResult()
    let err = await InitRule()
    if (!err) {
        ElMessage({
            showClose: true,
            message: "初始化指纹规则失败，请检查配置文件",
            type: "error"
        })
        return
    }
    FingerprintList().then(list => {
        dashboard.fingerLength = list.length
    })
    const pocMap = await GetFingerPocMap();
    dashboard.yamlPocsLength = Object.keys(pocMap).length

    const addedTags = new Set();

    for (const tags of Object.values(pocMap)) {
        for (const tag of tags) {
            if (!addedTags.has(tag)) {
                fingerOptions.value.push({
                    label: tag,
                    value: tag,
                });
                addedTags.add(tag);
            }
        }
    }
    TestNuclei()
});


const fingerOptions = ref<{ label: string, value: string }[]>([])

onMounted(() => {
    EventsOn("nucleiResult", (result: any) => {
        console.log(result)
        const riskLevelKey = result.Risk as keyof typeof dashboard.riskLevel;
        dashboard.riskLevel[riskLevelKey]++;
        vp.table.result.push({
            vulID: result.ID,
            vulName: result.Name,
            protocoltype: result.Type.toLocaleUpperCase(),
            severity: result.Risk.toLocaleUpperCase(),
            vulURL: result.URL,
            request: result.Request,
            response: result.Response,
            extInfo: result.Extract,
            description: result.Description,
            reference: result.Reference,
        })
        vp.table.pageContent = vp.ctrl.watchResultChange(vp.table)
    });
    EventsOn("webFingerScan", async (result: any) => {
        if (result.StatusCode == 0) {
            dashboard.reqErrorURLs.push(result.URL)
        } else {
            fp.table.result.push({
                url: result.URL,
                status: result.StatusCode,
                length: result.Length,
                title: result.Title,
                detect: result.Detect,
                existsWaf: result.IsWAF,
                waf: "WAF: " + result.WAF,
                fingerprint: result.Fingerprints,
            })
            fp.table.pageContent = fp.ctrl.watchResultChange(fp.table)
        }
    });
    return () => {
        EventsOff("nucleiResult");
        EventsOff("webFingerScan");
    };
})

const module = [
    {
        label: "指纹扫描",
        value: 0
    },
    {
        label: "指纹+敏感目录扫描",
        value: 1
    },
    {
        label: "指纹漏洞扫描",
        value: 2,
    },
    {
        label: "全部漏洞扫描",
        value: 3,
    }
]

const dashboard = reactive({
    reqErrorURLs: [] as string[],
    riskLevel: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
    },
    currentModule: "",
    count: 0,
    fingerLength: 0,
    yamlPocsLength: 0,
})

const form = reactive({
    url: '',
    tags: [] as string[],
    risk: [] as string[],
    riskOptions: ["critical", "high", "medium", "low"],
    newscanner: false,
    currentModule: 0,
    thread: 50,
    vulResult: [] as Vulnerability[],
    fingerResult: [] as FingerprintTable[],
    currentLoadPath: [] as string[],
    fofaDialog: false,
    fofaNum: 1000,
    hunterDialog: false,
    hunterNum: ["10", "20", "50", "100"],
    defaultNum: "100",
    query: '',
    runnningStatus: false,
    noInteractsh: false,
    rootPathScan: true,
})

const detailDialog = ref(false)
const selectedRow = ref();

function validateInput() {
    const ipPatterns = [
        /^(http:\/\/|https:\/\/)?(\d{1,3}\.){3}\d{1,3}(?:.*)/, // 192.168.1.1
        /^(http:\/\/|https:\/\/)?(\d{1,3}\.){3}\d{1,3}:\d{1,5}(?:.*)/, // 192.168.0.1:6379
        /^(http:\/\/|https:\/\/)?([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})*)(?::\d{1,5})?(?:.*)/, // www.baidu.com
    ];
    const lines = form.url.split('\n');
    return lines.every(line => {
        const trimmedLine = line.trim();
        // 允许空行，跳过空行的验证
        if (trimmedLine === '') {
            return true;
        }
        // 对非空行进行正则匹配
        return ipPatterns.some(pattern => pattern.test(trimmedLine));
    });
}

let fp = usePagination(form.fingerResult, 50)
let vp = usePagination(form.vulResult, 50)

async function startScan() {
    let ws = new Scanner
    form.newscanner = false // 隐藏界面
    if (!validateInput()) {
        ElMessage({
            type: "warning",
            message: "输入目标格式不正确",
        })
        return
    }
    ws.init()
    await ws.RunScanner()
}

function stopScan() {
    if (form.runnningStatus) {
        Kill(global.temp.currentPid)
        form.runnningStatus = false
        ElMessage({
            showClose: true,
            message: "任务已停止",
        });
    }
}

class Scanner {
    urls = [] as string[]
    public init() {
        global.temp.urlFingerMap = []
        fp.table.result = []
        vp.table.result = []
        dashboard.riskLevel.critical = 0
        dashboard.riskLevel.high = 0
        dashboard.riskLevel.medium = 0
        dashboard.riskLevel.low = 0
        dashboard.riskLevel.info = 0
        dashboard.reqErrorURLs = []
        dashboard.currentModule = ""
        form.runnningStatus = true
    }
    public async RunScanner() {
        // 检查先行条件
        if (!await TestProxy(1)) {
            return
        }
        this.urls = await formatURL2(form.url) // 处理目标
        dashboard.count = this.urls.length
        if (this.urls.length == 0) {
            ElMessage({
                showClose: true,
                message: "可用目标为空",
                type: "warning",
            });
            return
        }
        dashboard.currentModule = module[form.currentModule].label
        // 指纹扫描      
        Callgologger("info", `网站扫描任务已加载, 当前目标数量: ${this.urls.length}，当前扫描模式: ${dashboard.currentModule}`)
        Callgologger("info", '正在进行指纹扫描 ...')
        let mode = 0
        let deepScan = false
        let callNuclei = false
        if (form.currentModule != 0) {
            deepScan = true
            global.temp.currentPid = 0
        }
        if (form.currentModule == 2 || form.currentModule == 3) {
            callNuclei = true
            if (form.currentModule == 3) {
                mode = 1
            }
        }

        let option: NulceiOptions = {
            Mode: mode,
            CustomTags: form.tags,
            Engine: global.webscan.nucleiEngine,
            Risk: form.risk.join(","),
            Interactsh: form.noInteractsh,
            Proxy: global.proxy
        }

        await NewWebScanner(this.urls, global.proxy, form.thread, deepScan, form.rootPathScan, callNuclei, option)
        this.done()
        form.runnningStatus = false
    }
    public async done() {
        ElNotification.success({
            message: "Scanner Finished",
            position: "bottom-right",
        })
    }
}

// 联动空间引擎

const uncover = {
    fofa: function () {
        form.fofaDialog = false
        ElMessage("正在导入FOFA数据，请稍后...")
        FofaSearch(form.query, form.fofaNum.toString(), "1", global.space.fofaapi, global.space.fofaemail, global.space.fofakey, true, true).then((result: FofaResult) => {
            if (result.Error) {
                return
            }
            form.url = ""
            for (const item of result.Results!) {
                form.url += item.URL + "\n"
            }
        })
    },
    hunter: async function () {
        form.hunterDialog = false
        let urls = await LinkHunter(form.query, form.defaultNum)
        if (urls != undefined) {
            form.url = urls.join("\n")
        }
    },

}

function filterHandlerSeverity(value: string, row: any): boolean {
    return row.severity === value;
}
// 设置css样式
function getClassBySeverity(severity: string) {
    switch (severity) {
        case 'CRITICAL':
            return 'severity-critical';
        case 'HIGH':
            return 'severity-high';
        case 'MEDIUM':
            return 'severity-medium';
        case 'LOW':
            return 'severity-low';
        default:
            return 'severity-info';
    }
}

function transformedResult() {
    return vp.table.result.map(({ vulID, vulName, severity, vulURL, extInfo }) => ({
        vulID,
        vulName,
        severity,
        vulURL,
        extInfo,
    }))
}

function handleContextMenu(row: any, column: any, e: MouseEvent) {
    //prevent the browser's default menu
    e.preventDefault();
    //show our menu
    ContextMenu.showContextMenu({
        x: e.x,
        y: e.y,
        items: [
            {
                label: "复制链接",
                icon: h(CopyDocument, defaultIconSize),
                onClick: () => {
                    Copy(row.url)
                }
            },
            {
                label: "打开链接",
                icon: h(ChromeFilled, defaultIconSize),
                divided: true,
                onClick: () => {
                    BrowserOpenURL(row.url)
                }
            },
            {
                label: "联动目录扫描",
                icon: h(Promotion, defaultIconSize),
                onClick: () => {
                    LinkDirsearch(row.url)
                }
            },
        ]
    });
}

function BatchBrowserOpenURL() {
    const selectRows = JSON.parse(JSON.stringify(fp.table.selectRows));
    let targets = selectRows.map((item: any) => item.url)
    for (const item of targets) {
        BrowserOpenURL(item)
    }
}

function BatchCopyURL() {
    const selectRows = JSON.parse(JSON.stringify(fp.table.selectRows));
    let targets = selectRows.map((item: any) => item.url)
    CopyALL(targets)
}

const history = ref(false)
const historyData = ref(<{ taskTime: string, fileName: string, filePath: string, fileSize: number }[]>[])

async function ListNucleiScanResult() {
    let fileList = await List(global.PATH.homedir + "/slack/web_report")
    fileList.forEach((file: any) => {
        if (file.Path.endsWith(".json")) {
            historyData.value.push({
                taskTime: file.ModTime,
                fileName: file.BaseName,
                filePath: file.Path,
                fileSize: file.Size
            })
        }
    });
}

async function removeNucleiHistroy(filepath: string, fileSize: number, index: number) {
    if (fileSize == 2) {
        RemoveFile(filepath).then(bool => {
            if (bool) {
                historyData.value.splice(index, 1)
                ElMessage.success({
                    message: "删除成功",
                    grouping: true,
                })
                return
            }
            ElMessage.warning("删除文件失败!")
        })
        return
    }
    ElMessageBox.confirm(
        '确定删除该任务记录?',
        'Warning',
        {
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            type: 'warning',
        }
    )
        .then(() => {
            RemoveFile(filepath).then(bool => {
                if (bool) {
                    historyData.value.splice(index, 1)
                    ElMessage.success({
                        message: "删除成功",
                        grouping: true,
                    })
                    return
                }
                ElMessage.warning("删除文件失败!")
            })
        })
        .catch(() => {

        })
}

async function loadNucleiHistoryTask(filepath: string) {
    dashboard.riskLevel.critical = 0
    dashboard.riskLevel.high = 0
    dashboard.riskLevel.medium = 0
    dashboard.riskLevel.low = 0
    dashboard.riskLevel.info = 0
    vp.table.result = []
    vp.table.pageContent = vp.ctrl.watchResultChange(vp.table)
    LoadNulceiResult(filepath)
    history.value = false
}
</script>

<template>
    <el-scrollbar height="92vh">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>Dashboard</span>
                    <el-alert title="Nuclei engine is enabled" type="success" :closable="false" center show-icon
                        style="width: 50%; height: 30px" v-if="global.temp.nucleiEnabled" />
                    <el-alert title="Nuclei engine is underfind, please configure the nuclei path in the settings"
                        type="error" :closable="false" center show-icon style="width: 50%; height: 30px" v-else />
                    <div>
                        <el-button type="primary" :icon="Plus" @click="form.newscanner = true"
                            v-if="!form.runnningStatus">新建任务</el-button>
                        <el-button type="danger" :icon="VideoPause" @click="stopScan" v-else>停止任务</el-button>
                    </div>
                </div>
            </template>
            <el-row>
                <el-col :span="2" v-for="(total, risk) in dashboard.riskLevel">
                    <el-statistic :title="risk.toLocaleUpperCase()" :value="total" />
                </el-col>
                <el-divider direction="vertical" style="height: 7vh;" />
                <el-col :span="3">
                    <el-statistic title="指纹数量" :value="dashboard.fingerLength" />
                </el-col>
                <el-col :span="3">
                    <el-statistic title="漏洞数量" :value="dashboard.yamlPocsLength" />
                </el-col>
                <el-divider direction="vertical" style="height: 7vh;" />
                <el-col :span="7">
                    <el-statistic :value="dashboard.reqErrorURLs.length">
                        <template #title>
                            <div style="display: inline-flex; align-items: center">
                                失败数/目标数
                                <el-popover placement="left" :width="350" trigger="hover"
                                    v-if="dashboard.reqErrorURLs.length >= 1">
                                    <el-scrollbar height="150px">
                                        <p v-for="u in dashboard.reqErrorURLs" class="scrollbar-demo-item">
                                            {{ u }}</p>
                                    </el-scrollbar>
                                    <template #reference>
                                        <el-icon style="margin-left: 4px" :size="12">
                                            <ZoomIn />
                                        </el-icon>
                                    </template>
                                </el-popover>
                            </div>
                        </template>
                        <template #suffix>/{{ dashboard.count.toString() }}</template>
                    </el-statistic>
                </el-col>
            </el-row>
        </el-card>
        <div style="position: relative; margin-top: 10px;">
            <el-tabs type="border-card">
                <el-tab-pane label="指纹">
                    <el-table :data="fp.table.pageContent" stripe height="100vh"
                        @selection-change="fp.ctrl.handleSelectChange" :cell-style="{ textAlign: 'center' }"
                        :header-cell-style="{ 'text-align': 'center' }" @row-contextmenu="handleContextMenu">
                        <el-table-column type="selection" width="55px" />
                        <el-table-column fixed prop="url" label="URL" width="300px" :show-overflow-tooltip="true" />
                        <el-table-column prop="status" width="100px" label="Code"
                            :sort-method="(a: any, b: any) => { return a.status - b.status }" sortable
                            :show-overflow-tooltip="true" />
                        <el-table-column prop="length" width="100px" label="Length"
                            :sort-method="(a: any, b: any) => { return a.length - b.length }" sortable
                            :show-overflow-tooltip="true" />
                        <el-table-column prop="title" label="Title" />
                        <el-table-column prop="fingerprint" width="350px">
                            <template #header>
                                <el-tooltip placement="left" content="若指纹标签会呈现填充色，表示该指纹为敏感目录扫描得到">
                                    <el-icon>
                                        <QuestionFilled size="24" />
                                    </el-icon>
                                </el-tooltip>
                                Fingerprint
                            </template>
                            <template #default="scope">
                                <div class="finger-container">
                                    <el-tag v-for="finger in scope.row.fingerprint" :key="finger"
                                        :effect="scope.row.detect === 'Default' ? 'light' : 'dark'">{{ finger
                                        }}</el-tag>
                                    <el-tag type="danger" v-if="scope.row.existsWaf">{{ scope.row.waf }}</el-tag>
                                </div>
                            </template>
                        </el-table-column>
                        <template #empty>
                            <el-empty />
                        </template>
                    </el-table>
                    <div class="my-header" style="margin-top: 5px;">
                        <div></div>
                        <el-pagination size="small" background @size-change="fp.ctrl.handleSizeChange"
                            @current-change="fp.ctrl.handleCurrentChange" :pager-count="5"
                            :current-page="fp.table.currentPage" :page-sizes="[50, 100, 200]"
                            :page-size="fp.table.pageSize" layout="total, sizes, prev, pager, next"
                            :total="fp.table.result.length">
                        </el-pagination>
                    </div>
                </el-tab-pane>
                <el-tab-pane label="漏洞">
                    <el-table :data="vp.table.pageContent" stripe height="100vh" :cell-style="{ textAlign: 'center' }"
                        :header-cell-style="{ 'text-align': 'center' }">
                        <el-table-column prop="vulID" label="Template" width="250px" :show-overflow-tooltip="true" />
                        <el-table-column prop="severity" width="150px" label="Severity"
                            :filter-method="filterHandlerSeverity" :filters="[
                                { text: 'INFO', value: 'INFO' },
                                { text: 'LOW', value: 'LOW' },
                                { text: 'MEDIUM', value: 'MEDIUM' },
                                { text: 'HIGH', value: 'HIGH' },
                                { text: 'CRITICAL', value: 'CRITICAL' },
                            ]">
                            <template #filter-icon>
                                <Filter />
                            </template>
                            <template #default="scope">
                                <span :class="getClassBySeverity(scope.row.severity)">{{ scope.row.severity }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="vulURL" label="URL" />
                        <el-table-column label="操作" width="120px">
                            <template #default="scope">
                                <el-button type="primary" link @click="detailDialog = true; selectedRow = scope.row">
                                    查看详情
                                </el-button>
                            </template>
                        </el-table-column>
                        <template #empty>
                            <el-empty />
                        </template>
                    </el-table>
                    <div class="my-header" style="margin-top: 5px;">
                        <div></div>
                        <el-pagination size="small" background @size-change="vp.ctrl.handleSizeChange"
                            @current-change="vp.ctrl.handleCurrentChange" :pager-count="5"
                            :current-page="vp.table.currentPage" :page-sizes="[50, 100, 200]"
                            :page-size="vp.table.pageSize" layout="total, sizes, prev, pager, next"
                            :total="vp.table.result.length">
                        </el-pagination>
                    </div>
                </el-tab-pane>
            </el-tabs>
            <el-space class="custom_eltabs_titlebar" :size="2">
                <el-button :icon="RefreshRight" text bg type="danger" @click="TestNuclei()"
                    v-show="!global.temp.nucleiEnabled">Reload
                    Engine</el-button>
                <el-tooltip content="漏洞扫描任务历史">
                    <el-button text bg @click="history = true">
                        <template #icon>
                            <el-icon :size="16">
                                <historyIcon />
                            </el-icon>
                        </template>
                    </el-button>
                </el-tooltip>
                <!-- <el-tooltip content="导入指纹扫描结果">
                    <el-button text bg :icon="UploadFilled" @click="readXlsxFingerprint"></el-button>
                </el-tooltip> -->
                <el-dropdown>
                    <el-button :icon="Menu" text bg />
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item @click="CopyALL(dashboard.reqErrorURLs)"
                                :icon="CopyDocument">复制全部失败目标</el-dropdown-item>
                            <el-dropdown-item @click="BatchCopyURL()" :icon="CopyDocument">复制选中目标</el-dropdown-item>
                            <el-dropdown-item @click="BatchBrowserOpenURL" :icon="ChromeFilled"
                                divided>打开选中目标</el-dropdown-item>
                            <el-dropdown-item :icon="exportIcon" divided
                                @click="ExportWebScanToXlsx(transformArrayFields(fp.table.result), transformedResult())">
                                导出Excel</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </el-space>
        </div>
    </el-scrollbar>

    <el-drawer v-model="form.newscanner" size="50%">
        <template #header>
            <h4>新建扫描任务</h4>
            <el-button link @click="form.fofaDialog = true">
                <template #icon>
                    <img src="/app/fofa.ico">
                </template>
                FOFA
            </el-button>
            <el-divider direction="vertical" />
            <el-button link @click="form.hunterDialog = true">
                <template #icon>
                    <img src="/app/hunter.ico" style="width: 16px; height: 16px;">
                </template>
                Hunter
            </el-button>
        </template>
        <el-form label-width="auto">
            <el-form-item>
                <template #label>目标:
                    <el-tooltip placement="left">
                        <template #content>
                            支持如下输入方式:<br />
                            192.168.0.1<br />
                            192.168.0.1:443<br />
                            https://192.168.0.1
                        </template>
                        <el-icon>
                            <QuestionFilled size="24" />
                        </el-icon>
                    </el-tooltip>
                </template>
                <el-input v-model="form.url" type="textarea" :rows="6" clearable></el-input>
            </el-form-item>
            <el-form-item>
                <template #label>模式:
                    <el-tooltip>
                        <template #content>
                            1、指纹扫描: 只进行指纹，不会探测敏感目录<br />
                            2、指纹漏洞扫描: 指纹+敏感目录探测，扫描完成后扫描指纹对应POC<br />
                            3、敏感目录扫描: 会在指纹扫描基础上增加主动敏感目录探测，例如Nacos、报错页面信息判断指纹等<br />
                            4、全部漏洞扫描模式下具有更多的参数支持自定义<br />
                        </template>
                        <el-icon>
                            <QuestionFilled size="24" />
                        </el-icon>
                    </el-tooltip>
                </template>
                <el-radio-group v-model="form.currentModule">
                    <el-radio-button label="指纹扫描" :value="0" />
                    <el-radio-button label="指纹+敏感目录扫描" :value="1" />
                    <el-radio-button label="指纹漏洞扫描" :value="2" :disable="!global.temp.nucleiEnabled" />
                    <el-radio-button label="全部漏洞扫描" :value="3" :disable="!global.temp.nucleiEnabled" />
                </el-radio-group>
            </el-form-item>
            <div v-if="form.currentModule == 3">
                <el-form-item label="标签:" class="bottom">
                    <el-select-v2 v-model="form.tags" placeholder="POC必须要填写tags信息，相关指纹可通过此处查找" filterable
                        :options="fingerOptions" multiple />
                </el-form-item>
                <el-form-item label="风险等级:" class="bottom">
                    <el-select v-model="form.risk" placeholder="未选择即默认不进行筛选" multiple clearable style="width: 100%;">
                        <el-option v-for="item in form.riskOptions" :label="item.toLocaleUpperCase()" :value="item" />
                    </el-select>
                </el-form-item>
            </div>
            <el-form-item label="指纹线程:">
                <el-input-number controls-position="right" v-model="form.thread" :min="1" :max="2000" />
            </el-form-item>
            <el-form-item>
                <template #label>根路径扫描:
                    <el-tooltip placement="left" content="启用后主动指纹只拼接根路径，否则会拼接完整URL">
                        <el-icon>
                            <QuestionFilled size="24" />
                        </el-icon>
                    </el-tooltip>
                </template>
                <el-switch v-model="form.rootPathScan" />
            </el-form-item>
            <el-form-item label="禁用反连:">
                <el-switch v-model="form.noInteractsh" />
            </el-form-item>
        </el-form>
        <div>
            <el-button type="primary" @click="startScan"
                style="left: 45%;bottom: 10px; position: absolute;">开始任务</el-button>
        </div>
    </el-drawer>
    <el-drawer v-model="detailDialog" size="70%">
        <template #header>
            <el-button text bg>
                <template #icon>
                    <Notebook />
                </template>漏洞详情</el-button>
        </template>
        <div v-if="selectedRow">
            <el-descriptions :column="1" border style="margin-bottom: 10px;">
                <el-descriptions-item label="Name:">{{ selectedRow.vulName
                    }}</el-descriptions-item>
                <el-descriptions-item label="Extracted:">{{ selectedRow.extInfo
                    }}</el-descriptions-item>
                <el-descriptions-item label="Description:">{{ selectedRow.description
                    }}</el-descriptions-item>
                <el-descriptions-item label="Reference:" label-class-name="description">
                    <div v-for="item in selectedRow.reference.split(',')">
                        {{ item }}
                    </div>
                </el-descriptions-item>
            </el-descriptions>
            <div style="display: flex">
                <div class="pretty-response" style="font-size: small;">{{ selectedRow.request }}</div>
                <div class="pretty-response" style="font-size: small;">{{ selectedRow.response }}</div>
            </div>
        </div>
    </el-drawer>
    <el-dialog v-model="form.fofaDialog" title="导入FOFA目标(MAX 10000)" width="50%" center>
        <el-form :model="form" label-width="auto">
            <el-form-item label="查询条件">
                <el-input v-model="form.query"></el-input>
            </el-form-item>
            <el-form-item label="导入数量">
                <el-input-number v-model="form.fofaNum" :min="1" :max="10000" />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button type="primary" @click="uncover.fofa">
                导入
            </el-button>
        </template>
    </el-dialog>
    <el-dialog v-model="form.hunterDialog" title="导入鹰图目标(MAX100)，由于API查询大小限制，大数据推荐使用官网进行数据导出" width="50%" center>
        <el-form :model="form" label-width="auto">
            <el-form-item label="查询条件">
                <el-input v-model="form.query"></el-input>
            </el-form-item>
            <el-form-item label="导入数量">
                <el-select v-model="form.defaultNum" style="width: 150px;">
                    <el-option v-for="item in form.hunterNum" :label="item" :value="item" />
                </el-select>
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button type="primary" @click="uncover.hunter">
                导入
            </el-button>
        </template>
    </el-dialog>
    <el-drawer v-model="history" size="50%">
        <template #header>
            <el-text><el-icon :size="18">
                    <historyIcon />
                </el-icon>漏洞扫描任务历史<el-tag>仅在初始化时加载</el-tag></el-text>
        </template>
        <el-table :data="historyData">
            <el-table-column prop="fileName" label="文件名称"></el-table-column>
            <el-table-column prop="taskTime" label="任务时间"></el-table-column>
            <el-table-column prop="fileSize" label="文件大小" width="100px"></el-table-column>
            <el-table-column label="操作" width="180px" align="center">
                <template #default="scope">
                    <el-button-group>
                        <el-button :icon="View" link
                            @click.prevent="loadNucleiHistoryTask(scope.row.filePath)"></el-button>
                        <el-button :icon="DeleteFilled" link
                            @click.prevent="removeNucleiHistroy(scope.row.filePath, scope.row.fileSize, scope.$index)"></el-button>
                    </el-button-group>
                </template>
            </el-table-column>
            <template #empty>
                <el-empty></el-empty>
            </template>
        </el-table>
    </el-drawer>
</template>

<style>
.el-col {
    text-align: center;
}

.severity-critical {
    color: #AF63F6;
}

.severity-high {
    color: red;
}

.severity-medium {
    color: orange;
}

.severity-low {
    color: rgb(0, 145, 255);
}

.severity-info {
    color: green;
}

.scrollbar-demo-item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 50px;
    margin: 10px;
    text-align: center;
    border-radius: 4px;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
}

.align {
    display: flex;
    justify-content: left;
    align-items: center;
}

.align .el-icon {
    margin-right: 5px;
}

.finger-container {
    flex-wrap: wrap;
    display: flex;
    gap: 7px;
}

.description {
    width: 100px;
}

.el-text {
    display: flex;
    align-items: center;
    text-align: center
}
</style>