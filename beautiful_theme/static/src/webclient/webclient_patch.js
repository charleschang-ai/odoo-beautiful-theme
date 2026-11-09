import { WebClient } from "@web/webclient/webclient";
import { AppSidebar } from "./app_sidebar/app_sidebar";
import { MultiTabContainer } from "./multi_tab/multi_tab_container";

// 把 AppSidebar / MultiTabContainer 注册为 WebClient 的子组件；
// 模板注入见 webclient_patches.xml（t-inherit web.WebClient）
WebClient.components = { ...WebClient.components, AppSidebar, MultiTabContainer };
