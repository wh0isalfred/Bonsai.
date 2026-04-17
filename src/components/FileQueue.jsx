import FileCard from './Filecard'

export default function FileQueue({ files, onRemove, onRetry, onDownload, onCopy, onRename }) {
  if (!files.length) return null
  return (
    <div className="flex flex-col gap-2">
      {files.map(file => (
        <FileCard
          key={file.id}
          file={file}
          onRemove={onRemove}
          onRetry={onRetry}
          onDownload={onDownload}
          onCopy={onCopy}
          onRename={onRename}
        />
      ))}
    </div>
  )
}
