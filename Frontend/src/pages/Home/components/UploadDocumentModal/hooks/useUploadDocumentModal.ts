import { message } from 'antd'

export function useUploadDocumentModal() {
  const beforeUpload = () => {
    message.info('当前为 Mock 模式，文件不会真实上传。')
    return false
  }

  return {
    stageOptions: ['立项阶段', '实验阶段', '分析阶段', '归档阶段'],
    beforeUpload,
  }
}
