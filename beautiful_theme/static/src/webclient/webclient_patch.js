import { WebClientEnterprise } from "@web_enterprise/webclient/webclient";
import { AppSidebar } from "./app_sidebar/app_sidebar";
import { MultiTabContainer } from "./multi_tab/multi_tab_container";

// 把 AppSidebar / MultiTabContainer 注册为企业版 WebClient 的子组件；
// 模板注入见 webclient_patches.xml（t-inherit web.WebClient —— 企业版
// WebClientEnterprise 复用该模板名，扩展自然生效）。
// 注意必须挂在 WebClientEnterprise 上：它的 static components 在类定义时
// 就展开复制了 WebClient.components，本模块资源在其后加载，改基类不会传导。
WebClientEnterprise.components = {
    ...WebClientEnterprise.components,
    AppSidebar,
    MultiTabContainer,
};
