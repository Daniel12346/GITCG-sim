import { uploadToSupabaseBucket } from "@/app/utils";
import { myIDState } from "@/recoil/atoms";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRecoilValue } from "recoil";

type Props = {
  uploadPath?: string;
  bucketName: string;
  labelText?: string;
  iconSrc?: string;
  afterUpload?: (path: string) => void;
};
export default function ImageUpload({
  uploadPath,
  bucketName,
  labelText,
  iconSrc,
  afterUpload,
}: Props) {
  const client = createClientComponentClient();
  const myID = useRecoilValue(myIDState);
  const updateUserAvatar = async (url: string) => {
    // Update the user's avatar in the database
    await client.from("profile").update({ avatar_url: url }).eq("id", myID);
  };
  const updateUserBanner = async (url: string) => {
    // Update the user's banner in the database
    await client.from("profile").update({ banner_url: url }).eq("id", myID);
  };
  return (
    <span className="flex">
      <input
        id={bucketName}
        type="file"
        className="text-sm text-stone-500
            hidden text-[rgba(0,0,0,0)]"
        onChange={async (e) => {
          const file = e.target?.files?.[0];
          if (!file) return;
          const data = await uploadToSupabaseBucket({
            client,
            file,
            bucketName,
            uploadPath: uploadPath || `${myID}/${file.name}`,
          }).catch((error) => {
            console.error("Error uploading file", error);
          });
          if (data) {
            const { path } = data;
            if (bucketName === "avatars") {
              await updateUserAvatar(path);
            } else if (bucketName === "banners") {
              await updateUserBanner(path);
            }
            afterUpload && afterUpload(path);
          }
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
