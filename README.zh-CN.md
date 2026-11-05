# dsh-superagent-mode

[English](README.md) | [简体中文](README.zh-CN.md)

这是一个 DSH 插件包（bundle）。它把 [dsh-superagent](https://github.com/deepseek-ai/dsh-superagent-prototype)
的做事方式搬进普通会话，但不要它那套部署设施：没有 GitHub，没有飞书，没有机器人，也不起后台进程。

你在对话框里把需求说清楚，会话就按 superagent 的路子走：先掂量该做多大，把活拆出去派给
subagent，核对它们报回来的东西，最后一次性给你交代。

装和卸都走 DSH 自己的插件机制，跟其它 bundle 一样用 `dsh plugin`。这个包是一份生成的
YAML 补丁，外加一个小型 host 插件：每条操作者消息开始时，它会把派活规则再说一遍。

## 装完多什么

两个 agent 预设，都写在本包的 `cordis.patch.yml` 里：

| 预设 | 干什么的 |
| --- | --- |
| `Superagent` | 编排者。听懂需求后自己判断：直接动手、先问一个问题、还是停在需要你拍板的地方。范围压到能交付的最小值，把活派给 subagent，验收结果，每次请求按固定格式交代一次。 |
| `Superagent Worker` | 被派出去的 subagent 用的预设。照简报干活，自己验证改了什么，真遇到卡点立刻上报，汇报带证据。 |

两个预设都是从你装的这一版 DSH 自带的 `standard` 预设派生的，工具集跟它一样，Windows 与
非 Windows 的 shell 分支处理也一样。差别有三处：人格提示词（编排者的末尾还多两行派活提醒
suffix）、编排者专属的每轮提醒插件，以及 subagent 怎么接——`superagent` 把活派给
`superagent-worker`，worker 自己再开的 subagent 退回 `standard`。编排者保留 `standard` 预设
的完整工具集：它仍然可以直接改文件，只是提示词要求它别这么做。

## 装完不多什么

- 不改环境变量，不改 `PATH`，不改 git 配置。
- 除了 DSH 的 profile 目录，别处一个文件都不写。
- 不起进程，就在你日常那个 DSH 里加载。

说到底就是预设选择器里多两项。选不选、什么时候选还是你说了算，不选就跟没装一样。

## 派活规则靠什么维持

人格提示词里写了“每条操作者消息都是新任务”，但聊久了模型会漂。两个小机制会在它躲不开的
位置把规则再说一遍：

- 编排者人格末尾的两行 suffix；
- 一个 host 插件（`lib/reminder.js`，挂成 `superagent-reminder` 行），在每条操作者消息开始时
  注入一条很短的上下文消息。

提醒是每条操作者消息一次，不是每个模型 step 一次：子任务回报触发的 turn 会跳过。它每轮大约
多花 40 个 token，并在对话记录里多一条上下文消息。这是引导，不是闸门——编排者仍保留
`standard` 预设的完整工具集，没有任何东西强制它必须派活。

## 版本兼容性

0.1.2 面向 DSH **0.2.2-rc.1**，并在 `package.json` 里声明了
`"engines": { "dsh": ">=0.2.2-rc.1 <0.3.0-0" }`。DSH 加载 bundle 时会检查这个门槛，旧版本
会直接拒绝，而不是带着错版本的补丁跑起来。装之前先确认你的 DSH 版本。

补丁跨版本不是无损的：

- 在 0.2.1 上，bundle 会被 `engines.dsh` 拒绝。如果绕过这道门槛，补丁会丢掉 `list_agents`
  工具（0.2.1 通过后来被移除的 `dsh-tool-subagent-control/list-agents` 子路径提供它），并且
  由于新的 `modelSelection` 键，subagent 的模型选择也会失效。
- 按 0.2.1 生成的补丁在 0.2.2 上会坏掉：预设被标记为 broken，并从选择器里隐藏。

还在旧版本 DSH 上的用户，请继续用 0.1.1，或者在自己机器上跑 `node prepare.mjs` 重新生成
补丁；不要装 0.1.2。

## 安装

**先确认 DSH 版本。** 0.1.2 是为 DSH 0.2.2-rc.1 构建的；在 0.2.1 或更老的版本上，bundle 会被
它的 `engines.dsh` 门槛拒绝。那种情况请用 0.1.1，或者用 `prepare.mjs` 重新生成补丁。

生成的 `cordis.patch.yml` 是照着某一个具体 DSH 版本的 `standard` 预设派生的。下面四种装法
从最省事往下排，最终效果一样。

### 最省事：丢给 AI 让它自己装

开着 DSH 会话，或者手边有别的能执行命令的 AI 助手，把下面这句扔给它就行：

````text
把 https://github.com/lzskyline/dsh-superagent-mode 装成我的 DSH 插件，
按它 README 推荐的方式装。装完提醒我重启，并告诉我重启后选哪个预设。
````

### 从仓库手动装

仓库是公开的，不需要任何凭据：

```powershell
dsh plugin --profile <profile> add "github:lzskyline/dsh-superagent-mode"
```

pnpm 会把依赖钉到具体某个 commit，并带上完整性哈希，装到的内容不会偷偷变。它装的是仓库里
已提交的那份补丁，对应某一个 DSH 版本；版本不一样的机器请用下面的目录装法。

### 用打好的 tarball 装（离线，或版本相同）

tarball 里已经带了生成好的补丁，装的时候连 Node 都不需要：

```powershell
dsh plugin --profile <profile> add "C:\path\to\dsh-superagent-mode-<version>.tgz"
```

### 用目录装（版本不同，或升级过 DSH）

把整个目录拷到目标机器，用那台机器的 DSH 重新生成补丁，再从目录装：

```powershell
cd dsh-superagent-mode
node prepare.mjs                                   # 重新生成 cordis.patch.yml
dsh plugin --profile <profile> add "link:$PWD"     # $PWD 指本目录
```

`prepare.mjs` 会自己找 `dsh`（先翻 PATH，再翻桌面应用自带的路径），找不到就显式传
`--dsh "<dsh 路径>"`。它导出出厂配置时用的是系统临时目录下的一个一次性 `DSH_HOME`，
所以你真实的 profile 既不会被读，也不会被写。

用 `link:` 装，包就留在原地：改完 `prompts/*.md` 再跑一次 `prepare.mjs`，下次重启就能看到变化。
但这个目录一旦被移动或删掉，插件就挂了——要长期稳定用，建议用上面两种方式。

装完**重启 DeepSeek Harness 应用**，新建会话，在预设选择器里选 **Superagent**。

### 各平台说明

- **Windows**：`dsh` 在
  `%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd`。
- **macOS / Linux**：桌面应用在它的 resources 目录里带了同一个 CLI，`prepare.mjs` 会探常见位置；
  终端装的那版直接用 PATH 上的 `dsh`。
- 名字正好叫 `desktop` 的 profile，启动器不允许对它 boot 或 dump（会报
  `profile "desktop" is managed exclusively by the Electron application`），因为那是 Electron
  应用自己管的。不过 `dsh plugin` 不受这个限制——它只是转发给 pnpm——所以这类 profile 照样能
  用插件方式装卸。桌面应用里另有一套插件管理界面，也能用。

## 选预设

编排器里的预设选择只对**下一个会话**生效，不会改以后新任务的默认值。

要让 Superagent 成为新任务的默认预设，在预设菜单里选 **Set as new task default**（设为新任务
默认）。它会写入设置里的 `agent-preset-registry.selectedDefault`；出厂配置里的 `default` 仍是
`standard`，选中的默认值覆盖它。

升级 DSH 之后，去预设菜单和新任务默认值看一眼：加载失败的预设会从选择器里隐藏；如果
Superagent 不见了，重新把它设为新任务默认。

## 卸载

```powershell
dsh plugin --profile <profile> remove dsh-superagent-mode
```

依赖和 `dsh.profile.bundles` 里的条目会被一起清掉。重启后两个预设就没了，别的地方没动过。

## 升级 DSH 之后

预设里的插件清单来自出厂配置，补丁一旦过期，新版本新增的插件会被**静默丢掉**。所以升级完 DSH
记得重新生成：

```powershell
cd dsh-superagent-mode
node prepare.mjs
```

生成完还得让它进到应用里，怎么做取决于当初怎么装的：

```powershell
# 从 GitHub 装的：依赖钉在某个 commit 上，得重新解析
dsh plugin --profile <profile> add "github:lzskyline/dsh-superagent-mode"

# tarball 装的：重新打包再装一次
npm pack
dsh plugin --profile <profile> add "<新的 tarball>"

# 目录（link:）装的：不用重装，下次重启自动加载
```

光跑 `dsh plugin install` 是不够的：它会沿用已有的解析结果，不会把钉住的 commit 往前挪。

## 故障排查

### 重启后预设没了

应用日志里会出现 `skipping profile bundle "dsh-superagent-mode"`，应用照常启动，只是少了那两个
预设。这通常是 profile 的 `node_modules` 里那份副本被删掉、或被清理工具扫掉了。

`dsh plugin install` **修不好**：pnpm 只回一句 `Already up to date`，命令随后以退出码 1 结束。
得重新 `add`：

```powershell
dsh plugin --profile <profile> add "github:lzskyline/dsh-superagent-mode"
```

### 换包的来源

一定先 `remove` 再 `add`。把依赖声明从 `link:` 换成 `file:` 的 tarball、再换成 `github:`，
中间要是没删干净，`pnpm-lock.yaml` 里会留着旧的解析结果，`node_modules` 里会留个断掉的符号
链接，下次安装就报 `cannot resolve profile bundle`。

```powershell
dsh plugin --profile <profile> remove dsh-superagent-mode
dsh plugin --profile <profile> add "github:lzskyline/dsh-superagent-mode"
```

### 它不会自己联网

bundle 是从 profile 的 `node_modules` 里加载的，自己不碰网络。会联网的只有 `dsh plugin` 的增删
装操作，以及 DSH 应用自身的更新。副本没了是「跳过」，不是「重新下载」。

## 改提示词

别动 `cordis.patch.yml`，它是生成出来的。要改就改 `prompts/*.md`，然后：

```powershell
node prepare.mjs
```

`prompts/README.md` 里写了每段提示词的出处、相对原始设计刻意砍掉了什么、以及已知缺口。
动行为之前先看一眼。人格末尾那两行 suffix 在 `build.mjs` 的 `ORCHESTRATOR_SUFFIX` 里；每轮
提醒的文本在 `lib/reminder.js` 里。两者都不是从 `prompts/` 生成的。

## bundle 是怎么挂上去的

`package.json` 里这么声明：

```json
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "manifestVersion": 1
}
```

`dsh plugin --profile <name> add <spec>` 会把参数转给 profile 目录里的 pnpm。之后 DSH 自动做两件事：

1. 把这个包加进 profile 的依赖；
2. 把包名追加到 profile `package.json` 的 `dsh.profile.bundles` 里。

然后这个 bundle 的 `cordis.patch.yml` 就被合进该 profile。整个过程不用手改任何 profile 文件。

这个包不是纯 YAML。`package.json` 还暴露了 `dsh-superagent-mode/reminder`，指向
`lib/reminder.js`：

```json
"exports": {
  "./reminder": "./lib/reminder.js",
  "./package.json": "./package.json"
}
```

编排者预设把这个文件挂成一条普通的插件行。它是普通 ESM，没有构建步骤，跟其它 host 插件一样
从 profile 的 `node_modules` 加载。`@deepseek-ai/dsh-llm` 是 peer 依赖，由运行中的 DSH 提供。

## 文件

```
package.json        bundle 清单（dsh.bundle.patch + manifestVersion + exports）
prepare.mjs         导出本机出厂配置并重新生成补丁
build.mjs           派生逻辑：standard 预设 -> 我们要的两个预设
cordis.patch.yml    生成产物；bundle 实际贡献的内容
lib/reminder.js     host 插件：每条操作者消息注入一次派活提醒
prompts/*.md        提示词栈，一个关注点一个文件
```

`build.mjs` 会把依赖的每个锚点都断言一遍，对不上就**直接构建失败**，而不是产出一个能启动但
行为不对的预设。也就是说，将来 DSH 改了 `standard` 的形状，坏的是构建，不是你的应用。

## 做过哪些验证

0.1.1（历史记录）：

- `prepare.mjs` 是对一个一次性 `DSH_HOME` 生成的，碰不到真实 profile。
- 用 `dsh plugin --profile <p> add` 装（`github:`、tarball、`link:` 三种形态都试过），依赖和
  `dsh.profile.bundles` 会自动写入。
- `dsh --profile <p> --dump-config` 能正常合成，退出码 0、无诊断信息；五个提示词文件都在；
  `agentPreset: superagent-worker` 接线正确。
- `dsh plugin --profile <p> remove` 会把依赖和 bundle 条目一起清掉，预设随之从合成配置里消失。
- profile 能真实启动（`dsh web --port 0 --no-open`）并正常提供界面，启动日志里没有插件或预设报错。

0.1.2 在 DSH 0.2.2-rc.1 上：

- `node build.mjs <0.2.2 的 dump> cordis.patch.yml` 退出 0。生成的补丁能被 js-yaml 解析并通过
  断言：两个预设的 `tool-fs` 都只有 `applyPatch: false`；编排者人格带 re-arm 段、可数阈值和
  suffix，worker 都没有；编排者插件列表最后一行是 `superagent-reminder`，worker 没有这一行。
- 把重新生成的包拷进一次性 profile 后，`dsh --profile <p> --dump-config` 退出 0：两个预设都能
  合成，提醒行只出现在 `superagent` 里。
- 这个一次性 profile 能启动（`dsh web --port 0 --no-open`）并打印 URL，启动日志里没有插件或
  预设报错。
- 在一次性 headless profile 里直接挂上提醒插件，跑了一个真实单消息会话：step 1 的日志里有一条
  `user/message`，`source.kind` 为 `"superagent-reminder"`，排在对模型的请求之前。该次运行随后
  因这个一次性 home 没有 API key 而以 `MISSING_CREDENTIAL` 结束，所以没有验证到模型回复。
  另有一个 harness 覆盖了 step 2、子任务回报 turn、reject/abort 的直通，以及连续两条操作者
  消息都会注入。

## 目前做不到的

这些是丢掉 dsh-superagent 宿主机制之后的固有结果，不是 bug：

- **派活没有被强制。** 人格 suffix 和每轮提醒都只是引导；编排者保留完整工具集，没有任何东西
  阻止它直接改文件或跳过简报，只有提示词要求它别这样。
- **没有授权闸门。** 原版靠宿主强制的 Mandate 来卡工作范围；这里只剩提示词层面的纪律：模型被
  要求在碰到产品／UX 决策、公共接口变更、破坏性操作、缺凭证这些情况时停下来——但没有任何东西
  强制它真停。
- **没有工单台账。** 跨轮不持久，也没有面板，对话里那份汇报就是唯一的记录。
- **没有订阅续接。** subagent 是一次性的，看不见对话；有新上下文只能由编排者重新下简报。