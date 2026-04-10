import FileCard from './Filecard'
import ImageCompare from './ImageCompare'
export default function FileQueue({ files, onRemove, onRetry, onDownload }) {
  if (!files.length) return null

  return (
    <div className="flex flex-col gap-1.5">
      {files.map((file) => (
        <div
          key={file.id}
          className="animate-in fade-in slide-in-from-bottom-1 duration-200"
        >
            
          <FileCard
            file={file}
            onRemove={onRemove}
            onRetry={onRetry}
            onDownload={onDownload}
          />
          {file.status === 'done' && (
            <ImageCompare
                before={URL.createObjectURL(file.file)}
                after={file.result.url}
            />
            )}
        </div>
        
      ))}
    </div>
  )
}
