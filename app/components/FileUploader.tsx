import {useCallback} from 'react'
import {useDropzone} from 'react-dropzone'
import formatSize from "~/utils/formatSize";

export interface FileUploaderProps {
    onFileSelect: (file: File | null) => void;
    file?: File | null;
}

const FileUploader: React.FC<FileUploaderProps> = ({onFileSelect, file: controlledFile}) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0] || null ;
        onFileSelect?.(file);
    }, [onFileSelect])
    const {getRootProps, getInputProps, isDragActive , acceptedFiles} = useDropzone({onDrop ,
        multiple: false ,
        accept:{'application/pdf': ['.pdf'] },
        maxSize: 10 * 1024 * 1024,
    })

    // Prefer controlled file from parent when provided; fallback to dropzone's acceptedFiles
    const file = (controlledFile !== undefined ? controlledFile : (acceptedFiles[0] || null));




    return (
        <div className="w-full gradient-border">
            <div {...getRootProps({ role: 'button' })}>
                <input {...getInputProps({ id: 'uploader' })} />
                <div className="space-y-3 cursor-pointer">

                    {file ? (
                        <div className="uploader-selected-file">
                            <img  src="/images/pdf.png" alt="pdf" className="size-8" />
                            <div className= "flex items-center space-x-1">
                                <div>
                                    <p className="text-sm text-gray-700 max-w-xs truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {formatSize(file.size)}
                                    </p>
                                </div>
                            </div>

                            <button type="button" className="p-2 cursor-pointer"  onClick={(e) => { e.stopPropagation(); onFileSelect?.(null); }} aria-label="Remove selected file">
                                <img src="/icons/cross.svg" alt="remove" className="w-4 h-4" />
                            </button>
                        </div>

                    ):(
                        <div>
                            <div className="mx-auto w-16 h-16 flex items-center justify-center mb-2 ">
                                <img src="/icons/info.svg" alt="upload-icon" className="size-16"/>
                            </div>
                            <p className="text-lg text-gray-500">
                                <span className="font-semibold">
                                    Click to upload your resume
                                </span> or drag and drop
                            </p>
                            <p className="text-lg text-gray-500">
                                PDF (max 10MB)
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
export default FileUploader
