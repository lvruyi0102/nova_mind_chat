# GitHub Models 快速接入指南

本指南用于把 GitHub Models 立即接入到本项目，并提供本地与 GitHub Actions 两种测试方式。

## 1) 安装依赖

```bash
pip install -r scripts/ai/requirements.txt
```

## 2) 环境变量

设置访问令牌（推荐使用可访问 GitHub Models 的 token）：

```bash
export GITHUB_TOKEN=<your_token>
```

> 也支持 `GITHUB_MODELS_TOKEN`。

## 3) 立即运行（与官方片段一致）

```python
import os
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential

endpoint = "https://models.github.ai/inference"
model = "openai/gpt-4.1"
token = os.environ["GITHUB_TOKEN"]

client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(token),
)

response = client.complete(
    messages=[
        SystemMessage("You are a helpful assistant."),
        UserMessage("What is the capital of France?"),
    ],
    temperature=1.0,
    top_p=1.0,
    model=model
)

print(response.choices[0].message.content)
```

项目里已经提供了等价可执行脚本：

```bash
python scripts/ai/github_models_chat.py --prompt "What is the capital of France?"
```

## 4) 在测试环境比较不同模型

```bash
python scripts/ai/compare_models.py \
  --models openai/gpt-4.1 openai/gpt-4.1-mini \
  --prompt "请用 3 条要点总结该仓库目标"
```

输出为 Markdown 表格，包含：模型名、延迟、token 用量与输出预览。

## 5) 在 GitHub Actions 中比较模型

仓库已新增可手动触发工作流：`.github/workflows/github-models-eval.yml`

- 工作流名称：`GitHub Models Eval`
- 触发方式：`workflow_dispatch`
- 输入参数：`prompt`、`models`
- 产物：`model-comparison.md`

建议在仓库 Secrets 中配置：

- `GITHUB_MODELS_TOKEN`（可选，若不配置则回退到 `github.token`）

这样就可以“先比模型，再落地到项目”。
