import {useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/utils/formatSize";
import {prepareInstructions} from "~/constants";
import {useNavigate} from "react-router";



const Upload = () => {
    const [isProcessing , setIsProcessing] = useState(false);
    const [statusText , setStatusText] = useState("");
    const [file , setFile] = useState<File | null>(null);
    const {auth , isLoading ,fs ,ai ,kv} = usePuterStore();
    const navigate =useNavigate();

    const handleFileSelect = (file: File | null) => {
        setFile(file)
    }
    const handleAnalyse = async ({companyName , jobTitle , jobDescription , file} :{ companyName: string , jobTitle: string , jobDescription: string, file: File })=>{
        const log = (...args: any[]) => console.debug('[upload] ', ...args);
        setIsProcessing(true);
        setStatusText("Uploading the resume...");
        log('Start analyse with', { companyName, jobTitle, hasDescription: !!jobDescription, fileName: file?.name });
        const uploadedFile = await fs.upload([file]);
        if(!uploadedFile) {
            setStatusText('Error : Failed to Upload Resume');
            setIsProcessing(false);
            return;
        }

        setStatusText('Convertinng to image...');
        const imageFile = await convertPdfToImage(file);
        log('PDF->Image result', { ok: !!imageFile.file, error: imageFile.error });
        if(!imageFile.file) {
            setStatusText(`Error : Failed to Convert PDF to Image${imageFile.error ? ' - ' + imageFile.error : ''}`);
            setIsProcessing(false);
            return;
        }

        setStatusText('Uploading image...');
        const uploadedImage = await fs.upload([imageFile.file]);
        log('Image uploaded', { ok: !!uploadedImage, path: uploadedImage?.path });
        if(!uploadedImage) {
            setStatusText('Error : Failed to Upload image');
            setIsProcessing(false);
            return;
        }

        setStatusText('Preparing data for analysis...');


        const uuid = generateUUID() ;
        const data = {
            id: uuid,
            resumePath: uploadedFile.path,
            imagePath: uploadedImage.path,
            companyName,
            jobTitle,
            jobDescription,
            feedback: '',
        }
        await kv.set(`resume:${uuid}`, JSON.stringify(data));
        setStatusText('Analyse in progress...');

        const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
            let timer: ReturnType<typeof setTimeout>;
            return await Promise.race([
                promise.finally(() => clearTimeout(timer)),
                new Promise<T>((_, reject) => {
                    timer = setTimeout(() => reject(new Error('Analysis timed out')), ms);
                }),
            ]);
        };

        let feedback: any;
        try {
            const instructions = prepareInstructions({ jobTitle , jobDescription });
            log('Calling ai.feedback with', { resumePath: uploadedFile.path, model: 'claude-sonnet-4' });
            feedback = await withTimeout(ai.feedback(uploadedFile.path , instructions ) as Promise<any>, 60000);
        } catch (err) {
            console.error('ai.feedback failed:', err);
            setStatusText(`Error : Failed to Analyse Resume${err instanceof Error ? ' - ' + err.message : ''}`);
            setIsProcessing(false);
            return;
        }
        if (!feedback) {
            setStatusText('Error : Failed to Analyse Resume');
            setIsProcessing(false);
            return;
        }

        const content = feedback.message.content as unknown;
        let feedbackText = '';
        if (typeof content === 'string') {
            feedbackText = content;
        } else if (Array.isArray(content) && content.length > 0) {
            const first = content[0] as any;
            feedbackText = typeof first?.text === 'string' ? first.text : JSON.stringify(first);
        }

        try {
            data.feedback = JSON.parse(feedbackText);
        } catch (e) {
            data.feedback = feedbackText as any;
        }
        await kv.set(`resume:${uuid}`, JSON.stringify(data));
        setStatusText('Resume Analysed Successfully');
        console.log( data);
        navigate(`/resume/${uuid}`);


    }
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if (!form) return;
        const formData = new FormData(form);

        const companyName = String(formData.get('company-name') || '');
        const jobTitle = String(formData.get('job-title') || '');
        const jobDescription = String(formData.get('job-description') || '');

        if(!file) return;
        handleAnalyse({ companyName , jobTitle ,jobDescription ,file}) ;
    }


    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover ">
            <Navbar/>

            <section className="main-section">
                <div className="page-heading py-3">
                    <h2>Smart feedback for your dream job</h2>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" alt="scan-icon" className="w-[200px] h-[200px]"/>
                        </>
                    ): (
                        <h2>
                            Drop your your resume for an ATS score and improvement suggestions.
                        </h2>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4" >
                            <div className="form-div">
                                <label htmlFor="company-name" >Company</label>
                                <input type="text" name="company-name" id="company-name" placeholder="Company Name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title" >Job Title</label>
                                <input type="text" name="job-title" id="job-title" placeholder="Job Title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description" >Job Description</label>
                                <textarea rows={5} name="job-description" id="job-description" placeholder="Job Description" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="uploader" >Upload Resume</label>
                                <FileUploader file ={file} onFileSelect={handleFileSelect}/>
                                <button type="submit" className="primary-button">Analyse Resume</button>
                            </div>
                        </form>
                    )}
                </div>
           </section>
        </main>
    )
}
export default Upload
