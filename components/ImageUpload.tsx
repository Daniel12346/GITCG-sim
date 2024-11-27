import { uploadToSupabaseBucket } from "@/app/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Props = {
  uploadPath: string;
  bucketName: string;
  labelText?: string;
  iconSrc?: string;
  afterUpload?: () => void;
};
export default function ImageUpload({
  uploadPath,
  bucketName,
  labelText,
  iconSrc,
  afterUpload,
}: Props) {
  const client = createClientComponentClient();
  return (
    <span className="flex">
      <input
        id={bucketName}
        type="file"
        className="text-sm text-stone-500
            hidden text-[rgba(0,0,0,0)]"
        onChange={async (e) => {
          const file = e.target?.files?.[0];

          file &&
            file.name &&
            (await uploadToSupabaseBucket({
              client,
              file,
              bucketName,
              uploadPath,
            })
              .then((url) => {
                console.log("uploaded", url);
              })
              .catch((error) => {
                console.error("Error uploading file", error);
              }));
          afterUpload && afterUpload();
        }}
      />
      <label htmlFor={bucketName} className="text-slate-300 cursor-pointer">
        {iconSrc && (
          <img
            className=" w-5 hover:scale-125 transition-transform"
            src={iconSrc}
          ></img>
        )}
        {labelText}
      </label>
    </span>
  );
}
