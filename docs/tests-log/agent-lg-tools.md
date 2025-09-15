# 一个简单 lg 框架下的 agent-tool demo
对于多工具的调用，会在message中填入过个 ToolMessage；

```bash
(agent-lg) havoc420@HAVOCRAO-MC0 langgraph-agent % npx tsx agent-lg-tools.mts
🚀 开始 ToolNode 演示...

=== 1. 手动调用 ToolNode ===
单个工具调用结果: 旧金山现在是60度，有雾。
多个工具调用结果:
  工具 1: 纽约, 旧金山, 北京, 上海
  工具 2: 纽约现在是90度，阳光明媚。

=== 2. 与聊天模型一起使用 ===
测试单个工具调用:
代理回复: 旧金山现在的天气是60华氏度（约15.6摄氏度），有雾。天气比较凉爽，建议您出门时注意保暖，并注意雾天能见度较低的情况。

测试多个工具调用:
代理回复: 根据查询结果，最酷炫的城市包括：

1. **纽约** - 90°F（约32°C），阳光明媚
2. **旧金山** - 60°F（约16°C），有雾
3. **北京** - 75°F（约24°C），天气晴朗  
4. **上海** - 75°F（约24°C），天气晴朗

这些城市都是国际知名的酷炫都市，各有特色。纽约天气温暖晴朗，旧金山相对凉爽有雾，北京和上海都是宜人的晴朗天气。

=== 4. 流式处理示例 ===
流式处理工具调用:
😺 [
  HumanMessage {
    "id": "33c4fa63-93be-4d94-b34a-2709be6b27c1",
    "content": "请告诉我最酷炫城市的天气情况",
    "additional_kwargs": {},
    "response_metadata": {}
  }
]
😺 [
  HumanMessage {
    "id": "33c4fa63-93be-4d94-b34a-2709be6b27c1",
    "content": "请告诉我最酷炫城市的天气情况",
    "additional_kwargs": {},
    "response_metadata": {}
  },
  AIMessage {
    "id": "9807dfec-f830-4ee5-9d39-070d660185e2",
    "content": "",
    "additional_kwargs": {
      "tool_calls": [
        {
          "index": 0,
          "id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP",
          "type": "function",
          "function": "[Object]"
        }
      ]
    },
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 261,
        "completionTokens": 17,
        "totalTokens": 278
      },
      "finish_reason": "tool_calls",
      "model_name": "deepseek-chat",
      "usage": {
        "prompt_tokens": 261,
        "completion_tokens": 17,
        "total_tokens": 278,
        "prompt_tokens_details": {
          "cached_tokens": 256
        },
        "prompt_cache_hit_tokens": 256,
        "prompt_cache_miss_tokens": 5
      },
      "system_fingerprint": "fp_08f168e49b_prod0820_fp8_kvcache"
    },
    "tool_calls": [
      {
        "name": "get_coolest_cities",
        "args": {
          "noOp": ""
        },
        "type": "tool_call",
        "id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP"
      }
    ],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 17,
      "input_tokens": 261,
      "total_tokens": 278,
      "input_token_details": {
        "cache_read": 256
      },
      "output_token_details": {}
    }
  }
]
😺 [
  HumanMessage {
    "id": "33c4fa63-93be-4d94-b34a-2709be6b27c1",
    "content": "请告诉我最酷炫城市的天气情况",
    "additional_kwargs": {},
    "response_metadata": {}
  },
  AIMessage {
    "id": "9807dfec-f830-4ee5-9d39-070d660185e2",
    "content": "",
    "additional_kwargs": {
      "tool_calls": [
        {
          "index": 0,
          "id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP",
          "type": "function",
          "function": "[Object]"
        }
      ]
    },
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 261,
        "completionTokens": 17,
        "totalTokens": 278
      },
      "finish_reason": "tool_calls",
      "model_name": "deepseek-chat",
      "usage": {
        "prompt_tokens": 261,
        "completion_tokens": 17,
        "total_tokens": 278,
        "prompt_tokens_details": {
          "cached_tokens": 256
        },
        "prompt_cache_hit_tokens": 256,
        "prompt_cache_miss_tokens": 5
      },
      "system_fingerprint": "fp_08f168e49b_prod0820_fp8_kvcache"
    },
    "tool_calls": [
      {
        "name": "get_coolest_cities",
        "args": {
          "noOp": ""
        },
        "type": "tool_call",
        "id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP"
      }
    ],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 17,
      "input_tokens": 261,
      "total_tokens": 278,
      "input_token_details": {
        "cache_read": 256
      },
      "output_token_details": {}
    }
  },
  ToolMessage {
    "id": "a790d938-a5ec-4f29-9e38-4b4a22c05f8f",
    "content": "纽约, 旧金山, 北京, 上海",
    "name": "get_coolest_cities",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP"
  }
]
😺 [
  HumanMessage {
    "id": "33c4fa63-93be-4d94-b34a-2709be6b27c1",
    "content": "请告诉我最酷炫城市的天气情况",
    "additional_kwargs": {},
    "response_metadata": {}
  },
  AIMessage {
    "id": "9807dfec-f830-4ee5-9d39-070d660185e2",
    "content": "",
    "additional_kwargs": {
      "tool_calls": [
        {
          "index": 0,
          "id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP",
          "type": "function",
          "function": "[Object]"
        }
      ]
    },
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 261,
        "completionTokens": 17,
        "totalTokens": 278
      },
      "finish_reason": "tool_calls",
      "model_name": "deepseek-chat",
      "usage": {
        "prompt_tokens": 261,
        "completion_tokens": 17,
        "total_tokens": 278,
        "prompt_tokens_details": {
          "cached_tokens": 256
        },
        "prompt_cache_hit_tokens": 256,
        "prompt_cache_miss_tokens": 5
      },
      "system_fingerprint": "fp_08f168e49b_prod0820_fp8_kvcache"
    },
    "tool_calls": [
      {
        "name": "get_coolest_cities",
        "args": {
          "noOp": ""
        },
        "type": "tool_call",
        "id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP"
      }
    ],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 17,
      "input_tokens": 261,
      "total_tokens": 278,
      "input_token_details": {
        "cache_read": 256
      },
      "output_token_details": {}
    }
  },
  ToolMessage {
    "id": "a790d938-a5ec-4f29-9e38-4b4a22c05f8f",
    "content": "纽约, 旧金山, 北京, 上海",
    "name": "get_coolest_cities",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP"
  },
  AIMessage {
    "id": "076e1c5e-7912-4050-a5c1-2bc3b93c6af5",
    "content": "",
    "additional_kwargs": {
      "tool_calls": [
        {
          "index": 0,
          "id": "call_00_f0zwREUPLzq7tbpBbSfqqne7",
          "type": "function",
          "function": "[Object]"
        },
        {
          "index": 1,
          "id": "call_01_JABAJSfW79jmYP6p3bJyOeEb",
          "type": "function",
          "function": "[Object]"
        },
        {
          "index": 2,
          "id": "call_02_wiOulvx9Md6GBhJusExlKlxa",
          "type": "function",
          "function": "[Object]"
        },
        {
          "index": 3,
          "id": "call_03_UZ2fpHG2DCrUGzeVMfKO8vIu",
          "type": "function",
          "function": "[Object]"
        }
      ]
    },
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 292,
        "completionTokens": 47,
        "totalTokens": 339
      },
      "finish_reason": "tool_calls",
      "model_name": "deepseek-chat",
      "usage": {
        "prompt_tokens": 292,
        "completion_tokens": 47,
        "total_tokens": 339,
        "prompt_tokens_details": {
          "cached_tokens": 256
        },
        "prompt_cache_hit_tokens": 256,
        "prompt_cache_miss_tokens": 36
      },
      "system_fingerprint": "fp_08f168e49b_prod0820_fp8_kvcache"
    },
    "tool_calls": [
      {
        "name": "get_weather",
        "args": {
          "location": "纽约"
        },
        "type": "tool_call",
        "id": "call_00_f0zwREUPLzq7tbpBbSfqqne7"
      },
      {
        "name": "get_weather",
        "args": {
          "location": "旧金山"
        },
        "type": "tool_call",
        "id": "call_01_JABAJSfW79jmYP6p3bJyOeEb"
      },
      {
        "name": "get_weather",
        "args": {
          "location": "北京"
        },
        "type": "tool_call",
        "id": "call_02_wiOulvx9Md6GBhJusExlKlxa"
      },
      {
        "name": "get_weather",
        "args": {
          "location": "上海"
        },
        "type": "tool_call",
        "id": "call_03_UZ2fpHG2DCrUGzeVMfKO8vIu"
      }
    ],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 47,
      "input_tokens": 292,
      "total_tokens": 339,
      "input_token_details": {
        "cache_read": 256
      },
      "output_token_details": {}
    }
  }
]
😺 [
  HumanMessage {
    "id": "33c4fa63-93be-4d94-b34a-2709be6b27c1",
    "content": "请告诉我最酷炫城市的天气情况",
    "additional_kwargs": {},
    "response_metadata": {}
  },
  AIMessage {
    "id": "9807dfec-f830-4ee5-9d39-070d660185e2",
    "content": "",
    "additional_kwargs": {
      "tool_calls": [
        {
          "index": 0,
          "id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP",
          "type": "function",
          "function": "[Object]"
        }
      ]
    },
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 261,
        "completionTokens": 17,
        "totalTokens": 278
      },
      "finish_reason": "tool_calls",
      "model_name": "deepseek-chat",
      "usage": {
        "prompt_tokens": 261,
        "completion_tokens": 17,
        "total_tokens": 278,
        "prompt_tokens_details": {
          "cached_tokens": 256
        },
        "prompt_cache_hit_tokens": 256,
        "prompt_cache_miss_tokens": 5
      },
      "system_fingerprint": "fp_08f168e49b_prod0820_fp8_kvcache"
    },
    "tool_calls": [
      {
        "name": "get_coolest_cities",
        "args": {
          "noOp": ""
        },
        "type": "tool_call",
        "id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP"
      }
    ],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 17,
      "input_tokens": 261,
      "total_tokens": 278,
      "input_token_details": {
        "cache_read": 256
      },
      "output_token_details": {}
    }
  },
  ToolMessage {
    "id": "a790d938-a5ec-4f29-9e38-4b4a22c05f8f",
    "content": "纽约, 旧金山, 北京, 上海",
    "name": "get_coolest_cities",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP"
  },
  AIMessage {
    "id": "076e1c5e-7912-4050-a5c1-2bc3b93c6af5",
    "content": "",
    "additional_kwargs": {
      "tool_calls": [
        {
          "index": 0,
          "id": "call_00_f0zwREUPLzq7tbpBbSfqqne7",
          "type": "function",
          "function": "[Object]"
        },
        {
          "index": 1,
          "id": "call_01_JABAJSfW79jmYP6p3bJyOeEb",
          "type": "function",
          "function": "[Object]"
        },
        {
          "index": 2,
          "id": "call_02_wiOulvx9Md6GBhJusExlKlxa",
          "type": "function",
          "function": "[Object]"
        },
        {
          "index": 3,
          "id": "call_03_UZ2fpHG2DCrUGzeVMfKO8vIu",
          "type": "function",
          "function": "[Object]"
        }
      ]
    },
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 292,
        "completionTokens": 47,
        "totalTokens": 339
      },
      "finish_reason": "tool_calls",
      "model_name": "deepseek-chat",
      "usage": {
        "prompt_tokens": 292,
        "completion_tokens": 47,
        "total_tokens": 339,
        "prompt_tokens_details": {
          "cached_tokens": 256
        },
        "prompt_cache_hit_tokens": 256,
        "prompt_cache_miss_tokens": 36
      },
      "system_fingerprint": "fp_08f168e49b_prod0820_fp8_kvcache"
    },
    "tool_calls": [
      {
        "name": "get_weather",
        "args": {
          "location": "纽约"
        },
        "type": "tool_call",
        "id": "call_00_f0zwREUPLzq7tbpBbSfqqne7"
      },
      {
        "name": "get_weather",
        "args": {
          "location": "旧金山"
        },
        "type": "tool_call",
        "id": "call_01_JABAJSfW79jmYP6p3bJyOeEb"
      },
      {
        "name": "get_weather",
        "args": {
          "location": "北京"
        },
        "type": "tool_call",
        "id": "call_02_wiOulvx9Md6GBhJusExlKlxa"
      },
      {
        "name": "get_weather",
        "args": {
          "location": "上海"
        },
        "type": "tool_call",
        "id": "call_03_UZ2fpHG2DCrUGzeVMfKO8vIu"
      }
    ],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 47,
      "input_tokens": 292,
      "total_tokens": 339,
      "input_token_details": {
        "cache_read": 256
      },
      "output_token_details": {}
    }
  },
  ToolMessage {
    "id": "39baa2cd-e187-45a6-b1e7-0e2ca6b3d173",
    "content": "纽约现在是90度，阳光明媚。",
    "name": "get_weather",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_00_f0zwREUPLzq7tbpBbSfqqne7"
  },
  ToolMessage {
    "id": "fbd1ad0c-cfab-475c-9b1c-34d12bd4be1d",
    "content": "旧金山现在是60度，有雾。",
    "name": "get_weather",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_01_JABAJSfW79jmYP6p3bJyOeEb"
  },
  ToolMessage {
    "id": "25a3bfe8-5048-4031-bc3c-170f2d1772a0",
    "content": "北京现在是75度，天气晴朗。",
    "name": "get_weather",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_02_wiOulvx9Md6GBhJusExlKlxa"
  },
  ToolMessage {
    "id": "736c69d1-15ee-4a14-9460-0f75325d3985",
    "content": "上海现在是75度，天气晴朗。",
    "name": "get_weather",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_03_UZ2fpHG2DCrUGzeVMfKO8vIu"
  }
]
😺 [
  HumanMessage {
    "id": "33c4fa63-93be-4d94-b34a-2709be6b27c1",
    "content": "请告诉我最酷炫城市的天气情况",
    "additional_kwargs": {},
    "response_metadata": {}
  },
  AIMessage {
    "id": "9807dfec-f830-4ee5-9d39-070d660185e2",
    "content": "",
    "additional_kwargs": {
      "tool_calls": [
        {
          "index": 0,
          "id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP",
          "type": "function",
          "function": "[Object]"
        }
      ]
    },
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 261,
        "completionTokens": 17,
        "totalTokens": 278
      },
      "finish_reason": "tool_calls",
      "model_name": "deepseek-chat",
      "usage": {
        "prompt_tokens": 261,
        "completion_tokens": 17,
        "total_tokens": 278,
        "prompt_tokens_details": {
          "cached_tokens": 256
        },
        "prompt_cache_hit_tokens": 256,
        "prompt_cache_miss_tokens": 5
      },
      "system_fingerprint": "fp_08f168e49b_prod0820_fp8_kvcache"
    },
    "tool_calls": [
      {
        "name": "get_coolest_cities",
        "args": {
          "noOp": ""
        },
        "type": "tool_call",
        "id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP"
      }
    ],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 17,
      "input_tokens": 261,
      "total_tokens": 278,
      "input_token_details": {
        "cache_read": 256
      },
      "output_token_details": {}
    }
  },
  ToolMessage {
    "id": "a790d938-a5ec-4f29-9e38-4b4a22c05f8f",
    "content": "纽约, 旧金山, 北京, 上海",
    "name": "get_coolest_cities",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_00_MklPc3vYsUhrwtL9XXY3P5TP"
  },
  AIMessage {
    "id": "076e1c5e-7912-4050-a5c1-2bc3b93c6af5",
    "content": "",
    "additional_kwargs": {
      "tool_calls": [
        {
          "index": 0,
          "id": "call_00_f0zwREUPLzq7tbpBbSfqqne7",
          "type": "function",
          "function": "[Object]"
        },
        {
          "index": 1,
          "id": "call_01_JABAJSfW79jmYP6p3bJyOeEb",
          "type": "function",
          "function": "[Object]"
        },
        {
          "index": 2,
          "id": "call_02_wiOulvx9Md6GBhJusExlKlxa",
          "type": "function",
          "function": "[Object]"
        },
        {
          "index": 3,
          "id": "call_03_UZ2fpHG2DCrUGzeVMfKO8vIu",
          "type": "function",
          "function": "[Object]"
        }
      ]
    },
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 292,
        "completionTokens": 47,
        "totalTokens": 339
      },
      "finish_reason": "tool_calls",
      "model_name": "deepseek-chat",
      "usage": {
        "prompt_tokens": 292,
        "completion_tokens": 47,
        "total_tokens": 339,
        "prompt_tokens_details": {
          "cached_tokens": 256
        },
        "prompt_cache_hit_tokens": 256,
        "prompt_cache_miss_tokens": 36
      },
      "system_fingerprint": "fp_08f168e49b_prod0820_fp8_kvcache"
    },
    "tool_calls": [
      {
        "name": "get_weather",
        "args": {
          "location": "纽约"
        },
        "type": "tool_call",
        "id": "call_00_f0zwREUPLzq7tbpBbSfqqne7"
      },
      {
        "name": "get_weather",
        "args": {
          "location": "旧金山"
        },
        "type": "tool_call",
        "id": "call_01_JABAJSfW79jmYP6p3bJyOeEb"
      },
      {
        "name": "get_weather",
        "args": {
          "location": "北京"
        },
        "type": "tool_call",
        "id": "call_02_wiOulvx9Md6GBhJusExlKlxa"
      },
      {
        "name": "get_weather",
        "args": {
          "location": "上海"
        },
        "type": "tool_call",
        "id": "call_03_UZ2fpHG2DCrUGzeVMfKO8vIu"
      }
    ],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 47,
      "input_tokens": 292,
      "total_tokens": 339,
      "input_token_details": {
        "cache_read": 256
      },
      "output_token_details": {}
    }
  },
  ToolMessage {
    "id": "39baa2cd-e187-45a6-b1e7-0e2ca6b3d173",
    "content": "纽约现在是90度，阳光明媚。",
    "name": "get_weather",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_00_f0zwREUPLzq7tbpBbSfqqne7"
  },
  ToolMessage {
    "id": "fbd1ad0c-cfab-475c-9b1c-34d12bd4be1d",
    "content": "旧金山现在是60度，有雾。",
    "name": "get_weather",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_01_JABAJSfW79jmYP6p3bJyOeEb"
  },
  ToolMessage {
    "id": "25a3bfe8-5048-4031-bc3c-170f2d1772a0",
    "content": "北京现在是75度，天气晴朗。",
    "name": "get_weather",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_02_wiOulvx9Md6GBhJusExlKlxa"
  },
  ToolMessage {
    "id": "736c69d1-15ee-4a14-9460-0f75325d3985",
    "content": "上海现在是75度，天气晴朗。",
    "name": "get_weather",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_03_UZ2fpHG2DCrUGzeVMfKO8vIu"
  },
  AIMessage {
    "id": "356adebe-e3c6-4911-bd93-156281437b7c",
    "content": "根据查询结果，以下是全球最酷炫城市的天气情况：\n\n🌆 **纽约** - 90°F，阳光明媚\n🌁 **旧金山** - 60°F，有雾\n🏯 **北京** - 75°F，天气晴朗\n🏙️ **上海** - 75°F，天气晴朗\n\n这些城市都是全球公认的酷炫城市，各有特色。纽约阳光明媚但温度较高，旧金山有雾且温度凉爽，北京和上海都是晴朗的好天气，温度适宜。",
    "additional_kwargs": {},
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 381,
        "completionTokens": 110,
        "totalTokens": 491
      },
      "finish_reason": "stop",
      "model_name": "deepseek-chat",
      "usage": {
        "prompt_tokens": 381,
        "completion_tokens": 110,
        "total_tokens": 491,
        "prompt_tokens_details": {
          "cached_tokens": 320
        },
        "prompt_cache_hit_tokens": 320,
        "prompt_cache_miss_tokens": 61
      },
      "system_fingerprint": "fp_08f168e49b_prod0820_fp8_kvcache"
    },
    "tool_calls": [],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 110,
      "input_tokens": 381,
      "total_tokens": 491,
      "input_token_details": {
        "cache_read": 320
      },
      "output_token_details": {}
    }
  }
]
```